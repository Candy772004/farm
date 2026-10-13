import { Router } from 'express';
import { db } from '../db/db.js';
import { authenticate, requireApprovedFarmer, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/categories and /api/v1/products/categories
router.get(['/categories', '/products/categories'], async (_req, res) => {
  try {
    const categories = await db.categories.find({ isActive: true });
    res.json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/v1/products - List with search, filters, pagination, sort
router.get('/products', async (req, res) => {
  try {
    const {
      search,
      category,
      farmerId,
      organicOnly,
      inStockOnly,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    let filter: any = { isAvailable: true };

    if (category && category !== 'all') {
      filter.categoryId = category;
    }

    if (farmerId) {
      filter.farmerId = farmerId;
    }

    let allProducts = await db.products.find(filter);

    // In-memory text search and attribute filtering
    if (search && typeof search === 'string' && search.trim() !== '') {
      const query = search.trim().toLowerCase();
      allProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.farmName.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query)
      );
    }

    if (organicOnly === 'true') {
      allProducts = allProducts.filter(p => p.isOrganicCertified);
    }

    if (inStockOnly === 'true') {
      allProducts = allProducts.filter(p => p.stockQuantity > 0);
    }

    if (minPrice) {
      allProducts = allProducts.filter(p => p.price >= Number(minPrice));
    }

    if (maxPrice) {
      allProducts = allProducts.filter(p => p.price <= Number(maxPrice));
    }

    // Sorting
    if (sort === 'price_asc') {
      allProducts.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      allProducts.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      allProducts.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sort === 'harvest_date') {
      allProducts.sort((a, b) => new Date(b.harvestDate || 0).getTime() - new Date(a.harvestDate || 0).getTime());
    } else {
      // default: newest
      allProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = allProducts.length;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 12);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = allProducts.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      products: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET /api/v1/products/:id - Single product detail + linked batch & farmer verification
router.get('/products/:id', async (req, res) => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const farmerProfile = await db.farmerProfiles.findOne({ userId: product.farmerId });
    let batch = null;
    if (product.batchNumber) {
      batch = await db.produceBatches.findOne({ batchNumber: product.batchNumber });
    }

    res.json({
      success: true,
      product,
      farmer: farmerProfile ? {
        _id: farmerProfile._id,
        farmName: farmerProfile.farmName,
        bio: farmerProfile.bio,
        location: farmerProfile.location,
        farmingPractices: farmerProfile.farmingPractices,
        verificationStatus: farmerProfile.verificationStatus
      } : null,
      batch
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch product details.' });
  }
});

// POST /api/v1/products - Create product (requires approved farmer status)
router.post('/products', authenticate, requireApprovedFarmer, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      description,
      categoryId,
      price,
      unit,
      stockQuantity,
      images,
      harvestDate,
      batchNumber,
      isOrganicCertified
    } = req.body;

    if (!name || !price || !unit || stockQuantity === undefined || !categoryId) {
      res.status(400).json({ success: false, message: 'Name, category, price, unit, and stock quantity are required.' });
      return;
    }

    if (Number(price) <= 0) {
      res.status(400).json({ success: false, message: 'Price must be greater than zero.' });
      return;
    }

    if (Number(stockQuantity) < 0) {
      res.status(400).json({ success: false, message: 'Stock quantity cannot be negative.' });
      return;
    }

    const category = await db.categories.findById(categoryId);
    const farmerProfile = await db.farmerProfiles.findOne({ userId: req.user!.userId });

    const newProduct = await db.products.insertOne({
      farmerId: req.user!.userId,
      farmerName: req.user!.name,
      farmName: farmerProfile?.farmName || `${req.user!.name}'s Farm`,
      farmLocation: `${farmerProfile?.location.city || ''}, ${farmerProfile?.location.state || ''}`.trim(),
      name: name.trim(),
      description: description || '',
      categoryId,
      categoryName: category?.name || 'Produce',
      price: Number(price),
      unit,
      stockQuantity: Number(stockQuantity),
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'],
      harvestDate: harvestDate || new Date().toISOString().split('T')[0],
      batchNumber: batchNumber || undefined,
      isAvailable: true,
      isOrganicCertified: Boolean(isOrganicCertified),
      averageRating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Product listing published successfully.',
      product: newProduct
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create product listing.' });
  }
});

// PUT /api/v1/products/:id - Update product & inventory (ownership check & non-negative stock)
router.put('/products/:id', authenticate, requireApprovedFarmer, async (req: AuthenticatedRequest, res) => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    // Ownership check (or admin)
    if (product.farmerId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'You can only edit your own product listings.' });
      return;
    }

    const {
      name,
      description,
      categoryId,
      price,
      unit,
      stockQuantity,
      images,
      harvestDate,
      batchNumber,
      isAvailable,
      isOrganicCertified
    } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (categoryId) {
      const category = await db.categories.findById(categoryId);
      if (category) {
        updateData.categoryId = categoryId;
        updateData.categoryName = category.name;
      }
    }
    if (price !== undefined) {
      if (Number(price) <= 0) {
        res.status(400).json({ success: false, message: 'Price must be greater than zero.' });
        return;
      }
      updateData.price = Number(price);
    }
    if (unit) updateData.unit = unit;
    if (stockQuantity !== undefined) {
      if (Number(stockQuantity) < 0) {
        res.status(400).json({ success: false, message: 'Inventory quantity cannot be negative.' });
        return;
      }
      updateData.stockQuantity = Number(stockQuantity);
    }
    if (images) updateData.images = images;
    if (harvestDate) updateData.harvestDate = harvestDate;
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
    if (isAvailable !== undefined) updateData.isAvailable = Boolean(isAvailable);
    if (isOrganicCertified !== undefined) updateData.isOrganicCertified = Boolean(isOrganicCertified);

    const updated = await db.products.updateById(product._id, updateData);

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE /api/v1/products/:id - Deactivate product listing
router.delete('/products/:id', authenticate, requireApprovedFarmer, async (req: AuthenticatedRequest, res) => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    if (product.farmerId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'You can only deactivate your own products.' });
      return;
    }

    // Soft delete / mark unavailable
    await db.products.updateById(product._id, { isAvailable: false });

    res.json({ success: true, message: 'Product listing removed from marketplace.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

export default router;
