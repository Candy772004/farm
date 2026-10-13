import { Router } from 'express';
import { db } from '../db/db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/farmers/public - Browse verified farmers
router.get('/public', async (_req, res) => {
  try {
    const verifiedProfiles = await db.farmerProfiles.find({ verificationStatus: 'approved' });

    // Clean public view - hide bank accounts and sensitive internal documents
    const publicProfiles = verifiedProfiles.map(p => ({
      _id: p._id,
      userId: p.userId,
      farmName: p.farmName,
      bio: p.bio,
      location: {
        city: p.location.city,
        state: p.location.state,
        country: p.location.country
      },
      totalAcreage: p.totalAcreage,
      farmingPractices: p.farmingPractices,
      verificationStatus: p.verificationStatus,
      verifiedCertifications: (p.documents || [])
        .filter(d => d.verified)
        .map(d => ({ title: d.title, type: d.type })),
      createdAt: p.createdAt
    }));

    res.json({ success: true, farmers: publicProfiles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch verified farmers.' });
  }
});

// GET /api/v1/farmers/public/:id - Single farmer details + products
router.get('/public/:id', async (req, res) => {
  try {
    const profile = await db.farmerProfiles.findById(req.params.id);
    if (!profile || profile.verificationStatus !== 'approved') {
      res.status(404).json({ success: false, message: 'Verified farmer profile not found.' });
      return;
    }

    const products = await db.products.find({ farmerId: profile.userId, isAvailable: true });

    res.json({
      success: true,
      farmer: {
        _id: profile._id,
        userId: profile.userId,
        farmName: profile.farmName,
        bio: profile.bio,
        location: {
          city: profile.location.city,
          state: profile.location.state,
          country: profile.location.country
        },
        totalAcreage: profile.totalAcreage,
        farmingPractices: profile.farmingPractices,
        verificationStatus: profile.verificationStatus,
        verifiedCertifications: (profile.documents || [])
          .filter(d => d.verified)
          .map(d => ({ title: d.title, type: d.type })),
        createdAt: profile.createdAt
      },
      products
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch farmer profile.' });
  }
});

// GET /api/v1/farmers/profile - Current logged in farmer profile
router.get('/profile', authenticate, requireRole(['farmer']), async (req: AuthenticatedRequest, res) => {
  try {
    let profile = await db.farmerProfiles.findOne({ userId: req.user!.userId });
    if (!profile) {
      // Create fresh default profile
      profile = await db.farmerProfiles.insertOne({
        userId: req.user!.userId,
        farmName: `${req.user!.name}'s Farm`,
        bio: '',
        location: { address: '', city: '', state: '', country: 'United States' },
        totalAcreage: 5,
        farmingPractices: ['Natural Methods'],
        verificationStatus: 'not_submitted',
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load farmer profile.' });
  }
});

// PUT /api/v1/farmers/profile - Update profile details
router.put('/profile', authenticate, requireRole(['farmer']), async (req: AuthenticatedRequest, res) => {
  try {
    const { farmName, bio, location, totalAcreage, farmingPractices, bankAccountDetails } = req.body;
    let profile = await db.farmerProfiles.findOne({ userId: req.user!.userId });

    if (!profile) {
      res.status(404).json({ success: false, message: 'Farmer profile not found.' });
      return;
    }

    const updateData: any = {};
    if (farmName) updateData.farmName = farmName.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (location) updateData.location = { ...profile.location, ...location };
    if (totalAcreage) updateData.totalAcreage = Number(totalAcreage);
    if (farmingPractices && Array.isArray(farmingPractices)) updateData.farmingPractices = farmingPractices;
    if (bankAccountDetails) updateData.bankAccountDetails = bankAccountDetails;

    const updated = await db.farmerProfiles.updateById(profile._id, updateData);
    res.json({ success: true, message: 'Profile updated successfully.', profile: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update farmer profile.' });
  }
});

// POST /api/v1/farmers/verification - Submit verification application
router.post('/verification', authenticate, requireRole(['farmer']), async (req: AuthenticatedRequest, res) => {
  try {
    const { farmName, totalAcreage, farmingPractices, documents, location } = req.body;

    let profile = await db.farmerProfiles.findOne({ userId: req.user!.userId });
    if (!profile) {
      profile = await db.farmerProfiles.insertOne({
        userId: req.user!.userId,
        farmName: farmName || `${req.user!.name}'s Farm`,
        bio: '',
        location: location || { address: '', city: '', state: '', country: 'United States' },
        totalAcreage: totalAcreage || 5,
        farmingPractices: farmingPractices || [],
        verificationStatus: 'not_submitted',
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (profile.verificationStatus === 'approved') {
      res.status(400).json({ success: false, message: 'Your farm is already approved and verified.' });
      return;
    }

    if (!documents || documents.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide at least one verification evidence or certificate document.' });
      return;
    }

    const formattedDocs = documents.map((d: any) => ({
      title: d.title || 'Farm Documentation',
      type: d.type || 'land_record',
      url: d.url || 'https://docs.farm2trust.org/uploads/doc-' + Date.now() + '.pdf',
      verified: false
    }));

    const updated = await db.farmerProfiles.updateById(profile._id, {
      farmName: farmName || profile.farmName,
      totalAcreage: totalAcreage ? Number(totalAcreage) : profile.totalAcreage,
      farmingPractices: farmingPractices || profile.farmingPractices,
      location: location || profile.location,
      verificationStatus: 'pending',
      rejectionReason: undefined,
      documents: formattedDocs,
      updatedAt: new Date().toISOString()
    });

    // Record audit log
    await db.auditLogs.insertOne({
      action: 'FARMER_VERIFICATION_SUBMITTED',
      actorId: req.user!.userId,
      actorRole: 'farmer',
      actorEmail: req.user!.email,
      targetEntity: 'FarmerProfile',
      targetId: profile._id,
      details: {
        farmName: updated?.farmName,
        documentsSubmitted: formattedDocs.length
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Verification application submitted for review by administrators.',
      profile: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to submit verification application.' });
  }
});

// GET /api/v1/farmers/analytics - Farmer sales, revenue, and stock metrics
router.get('/analytics', authenticate, requireRole(['farmer']), async (req: AuthenticatedRequest, res) => {
  try {
    const products = await db.products.find({ farmerId: req.user!.userId });
    const allOrders = await db.orders.find();

    // Filter orders containing items from this farmer
    const farmerOrders = allOrders.filter(o =>
      o.items.some(item => item.farmerId === req.user!.userId)
    );

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const completedOrdersCount = farmerOrders.filter(o => o.status === 'Delivered').length;
    const activeOrdersCount = farmerOrders.filter(o => ['Placed', 'Confirmed', 'Packed', 'Shipped'].includes(o.status)).length;

    farmerOrders.forEach(o => {
      if (o.status !== 'Cancelled') {
        o.items.forEach(item => {
          if (item.farmerId === req.user!.userId) {
            totalRevenue += item.subtotal;
            totalItemsSold += item.quantity;
          }
        });
      }
    });

    const lowStockProducts = products.filter(p => p.stockQuantity <= 15 && p.isAvailable);

    res.json({
      success: true,
      analytics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: farmerOrders.length,
        completedOrdersCount,
        activeOrdersCount,
        totalItemsSold,
        totalProductsListed: products.length,
        lowStockAlerts: lowStockProducts.length
      },
      lowStockProducts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch farmer analytics.' });
  }
});

export default router;
