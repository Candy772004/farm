import { Router } from 'express';
import { db } from '../db/db.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes with authentication and require 'admin' role
router.use(authenticate, requireRole(['admin']));

// GET /api/v1/admin/analytics - Platform performance and marketplace metrics
router.get('/analytics', async (_req, res) => {
  try {
    const users = await db.users.find();
    const farmers = await db.farmerProfiles.find();
    const products = await db.products.find();
    const orders = await db.orders.find();

    const totalGMV = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingApplications = farmers.filter(f => f.verificationStatus === 'pending').length;
    const approvedFarmers = farmers.filter(f => f.verificationStatus === 'approved').length;
    const rejectedFarmers = farmers.filter(f => f.verificationStatus === 'rejected').length;

    const customersCount = users.filter(u => u.role === 'customer').length;
    const farmersCount = users.filter(u => u.role === 'farmer').length;

    res.json({
      success: true,
      metrics: {
        totalGMV: Math.round(totalGMV * 100) / 100,
        totalOrders: orders.length,
        deliveredOrders: orders.filter(o => o.status === 'Delivered').length,
        pendingApplications,
        approvedFarmers,
        rejectedFarmers,
        totalProducts: products.length,
        totalCustomers: customersCount,
        totalFarmers: farmersCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin analytics.' });
  }
});

// GET /api/v1/admin/applications - List farmer verification applications
router.get('/applications', async (req, res) => {
  try {
    const { status } = req.query;
    let profiles = await db.farmerProfiles.find();

    if (status && status !== 'all') {
      profiles = profiles.filter(p => p.verificationStatus === status);
    }

    // Enrich with user email & phone
    const enriched = await Promise.all(
      profiles.map(async p => {
        const user = await db.users.findById(p.userId);
        return {
          ...p,
          farmerEmail: user?.email || '',
          farmerPhone: user?.phone || '',
          farmerRealName: user?.name || ''
        };
      })
    );

    res.json({ success: true, applications: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch verification applications.' });
  }
});

// POST /api/v1/admin/applications/:id/review - Approve or Reject farmer verification
router.post('/applications/:id/review', async (req: AuthenticatedRequest, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve' | 'reject'
    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, message: 'Action must be either "approve" or "reject".' });
      return;
    }

    if (action === 'reject' && (!reason || reason.trim() === '')) {
      res.status(400).json({ success: false, message: 'A clear rejection reason is required.' });
      return;
    }

    const profile = await db.farmerProfiles.findById(req.params.id);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Farmer application profile not found.' });
      return;
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update document verification statuses if approved
    const updatedDocs = (profile.documents || []).map(doc => ({
      ...doc,
      verified: action === 'approve'
    }));

    const updatedProfile = await db.farmerProfiles.updateById(profile._id, {
      verificationStatus: nextStatus,
      rejectionReason: action === 'reject' ? reason.trim() : undefined,
      reviewedBy: req.user!.userId,
      reviewedAt: new Date().toISOString(),
      documents: updatedDocs
    });

    // Create Audit Log
    await db.auditLogs.insertOne({
      action: action === 'approve' ? 'FARMER_VERIFICATION_APPROVED' : 'FARMER_VERIFICATION_REJECTED',
      actorId: req.user!.userId,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      targetEntity: 'FarmerProfile',
      targetId: profile._id,
      details: {
        farmName: profile.farmName,
        previousStatus: profile.verificationStatus,
        newStatus: nextStatus,
        reason: reason || 'Verified all required agricultural credentials.'
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Farmer application has been ${nextStatus}.`,
      profile: updatedProfile
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to review application.' });
  }
});

// GET /api/v1/admin/audit-logs - Administrative audit trail
router.get('/audit-logs', async (_req, res) => {
  try {
    const logs = await db.auditLogs.find();
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

// PATCH /api/v1/admin/products/:id/toggle - Suspend/reactivate suspicious product
router.patch('/products/:id/toggle', async (req: AuthenticatedRequest, res) => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const updated = await db.products.updateById(product._id, {
      isAvailable: !product.isAvailable
    });

    await db.auditLogs.insertOne({
      action: updated?.isAvailable ? 'PRODUCT_REACTIVATED' : 'PRODUCT_SUSPENDED',
      actorId: req.user!.userId,
      actorRole: 'admin',
      actorEmail: req.user!.email,
      targetEntity: 'Product',
      targetId: product._id,
      details: {
        productName: product.name,
        newAvailability: updated?.isAvailable
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Product is now ${updated?.isAvailable ? 'active' : 'suspended'}.`,
      product: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update product status.' });
  }
});

export default router;
