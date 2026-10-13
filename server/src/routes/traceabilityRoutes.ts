import { Router } from 'express';
import QRCode from 'qrcode';
import { db } from '../db/db.js';
import { authenticate, requireApprovedFarmer, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/traceability/:batchNumber - PUBLIC traceability endpoint
router.get('/:batchNumber', async (req, res) => {
  try {
    const { batchNumber } = req.params;
    const batch = await db.produceBatches.findOne({ batchNumber });

    if (!batch) {
      res.status(404).json({
        success: false,
        message: `Batch "${batchNumber}" was not found in the Farm2Trust transparent ledger.`
      });
      return;
    }

    const product = await db.products.findById(batch.productId);
    const farmerProfile = await db.farmerProfiles.findOne({ userId: batch.farmerId });

    // Sanitized, safe public payload (strictly no customer info, tokens, or private docs)
    const publicData = {
      batchNumber: batch.batchNumber,
      product: {
        id: batch.productId,
        name: batch.productName,
        category: product?.categoryName || 'Produce',
        image: product?.images[0] || ''
      },
      origin: {
        farmerName: batch.farmerName,
        farmName: batch.farmName,
        location: batch.farmLocation,
        verificationStatus: farmerProfile?.verificationStatus || 'unverified',
        soilAndWaterPractices: batch.soilAndWaterPractices || 'Standard sustainable cultivation'
      },
      harvestDetails: {
        harvestDate: batch.harvestDate,
        bestBeforeDate: batch.bestBeforeDate,
        variety: batch.variety,
        pesticideFreeTested: batch.pesticideFreeTested,
        certifications: batch.certifications || []
      },
      events: batch.events || [],
      qrCodeDataUrl: batch.qrCodeDataUrl,
      trustNotice: {
        disclaimer: 'Farm2Trust transparent ledger logs on-farm events and lab inspections. Official certifications are verified against agricultural registry records.',
        lastVerified: batch.updatedAt
      }
    };

    res.json({ success: true, traceability: publicData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve batch traceability data.' });
  }
});

// GET /api/v1/traceability/farmer/batches - Farmer's batches list
router.get('/farmer/batches', authenticate, requireApprovedFarmer, async (req: AuthenticatedRequest, res) => {
  try {
    const batches = await db.produceBatches.find({ farmerId: req.user!.userId });
    batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, batches });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch farmer batches.' });
  }
});

// POST /api/v1/traceability/batches - Create batch with QR code
router.post('/batches', authenticate, requireApprovedFarmer, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      productId,
      harvestDate,
      bestBeforeDate,
      variety,
      certifications,
      soilAndWaterPractices,
      pesticideFreeTested
    } = req.body;

    if (!productId || !harvestDate) {
      res.status(400).json({ success: false, message: 'Product ID and harvest date are required.' });
      return;
    }

    const product = await db.products.findById(productId);
    if (!product || product.farmerId !== req.user!.userId) {
      res.status(400).json({ success: false, message: 'Selected product does not belong to your farm.' });
      return;
    }

    const farmerProfile = await db.farmerProfiles.findOne({ userId: req.user!.userId });

    // Generate unique batch number: F2T-BAT-<YEAR>-<RANDOM>
    const cleanProdPrefix = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
    const batchNumber = `F2T-BAT-${new Date().getFullYear()}-${cleanProdPrefix}-${Math.floor(100 + Math.random() * 900)}`;

    const initialEvents = [
      {
        title: 'Crop Harvest & In-Field Grading',
        stage: 'harvest' as const,
        timestamp: new Date(harvestDate).toISOString(),
        location: farmerProfile ? `${farmerProfile.location.city}, ${farmerProfile.location.state}` : 'Farm Field',
        actor: req.user!.name,
        details: `Batch harvested. Variety: ${variety || 'Local cultivar'}. Natural practices applied.`,
        verified: true
      }
    ];

    // Generate public QR link
    const baseUrl = process.env.APP_URL || 'https://farm2trust.app';
    const qrTargetUrl = `${baseUrl}/traceability/${batchNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      margin: 1,
      width: 320,
      color: { dark: '#14532d', light: '#ffffff' }
    });

    const newBatch = await db.produceBatches.insertOne({
      batchNumber,
      productId: product._id,
      productName: product.name,
      farmerId: req.user!.userId,
      farmerName: req.user!.name,
      farmName: farmerProfile?.farmName || product.farmName,
      farmLocation: farmerProfile ? `${farmerProfile.location.city}, ${farmerProfile.location.state}` : product.farmLocation,
      harvestDate: new Date(harvestDate).toISOString(),
      bestBeforeDate: bestBeforeDate ? new Date(bestBeforeDate).toISOString() : undefined,
      variety: variety || undefined,
      certifications: certifications || farmerProfile?.farmingPractices || [],
      soilAndWaterPractices: soilAndWaterPractices || 'Regenerative organic practices and clean irrigation',
      pesticideFreeTested: Boolean(pesticideFreeTested),
      qrCodeDataUrl,
      events: initialEvents,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Link batch to product
    await db.products.updateById(product._id, {
      batchNumber,
      harvestDate: harvestDate
    });

    res.status(201).json({
      success: true,
      message: `Traceability batch ${batchNumber} created and QR code generated!`,
      batch: newBatch
    });
  } catch (error: any) {
    console.error('Batch creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create produce batch.' });
  }
});

// POST /api/v1/traceability/batches/:batchNumber/events - Add event to batch timeline
router.post('/batches/:batchNumber/events', authenticate, requireApprovedFarmer, async (req: AuthenticatedRequest, res) => {
  try {
    const { batchNumber } = req.params;
    const { title, stage, location, details } = req.body;

    if (!title || !stage || !location) {
      res.status(400).json({ success: false, message: 'Title, stage, and location are required.' });
      return;
    }

    const batch = await db.produceBatches.findOne({ batchNumber });
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found.' });
      return;
    }

    if (batch.farmerId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only the creator of this batch can add events.' });
      return;
    }

    const newEvent = {
      title,
      stage,
      timestamp: new Date().toISOString(),
      location,
      actor: req.user!.name,
      details: details || '',
      verified: true
    };

    const updated = await db.produceBatches.updateById(batch._id, {
      $push: { events: newEvent }
    });

    res.json({
      success: true,
      message: 'Traceability event recorded in batch timeline.',
      batch: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record event.' });
  }
});

export default router;
