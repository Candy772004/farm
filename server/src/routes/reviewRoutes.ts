import { Router } from 'express';
import { db } from '../db/db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/reviews/product/:productId - Get verified customer reviews for product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await db.reviews.find({
      productId: req.params.productId,
      isModerated: false
    });
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// POST /api/v1/reviews - Submit review (strict qualification check)
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body;

    if (!productId || !orderId || !rating || !title || !comment) {
      res.status(400).json({ success: false, message: 'Product ID, Order ID, rating, title, and comment are required.' });
      return;
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
      return;
    }

    // Step 1: Verify order exists, belongs to this customer, and has status 'Delivered'
    const order = await db.orders.findById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (order.customerId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'You can only review products from your own orders.' });
      return;
    }

    if (order.status !== 'Delivered') {
      res.status(400).json({
        success: false,
        message: `Reviews are permitted only for verified delivered orders. This order is currently in "${order.status}" status.`
      });
      return;
    }

    // Step 2: Verify the product was actually in this order
    const hasProductInOrder = order.items.some(item => item.productId === productId);
    if (!hasProductInOrder) {
      res.status(400).json({
        success: false,
        message: 'This product was not part of the specified order.'
      });
      return;
    }

    // Step 3: Prevent duplicate review for the same order and product
    const existingReview = await db.reviews.findOne({
      orderId,
      productId,
      customerId: req.user!.userId
    });

    if (existingReview) {
      res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this product from this order.'
      });
      return;
    }

    // Step 4: Create review
    const newReview = await db.reviews.insertOne({
      productId,
      orderId,
      customerId: req.user!.userId,
      customerName: req.user!.name,
      rating: Math.round(numRating),
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedPurchase: true,
      isModerated: false,
      createdAt: new Date().toISOString()
    });

    // Step 5: Recalculate product aggregate ratings safely
    const allProductReviews = await db.reviews.find({ productId, isModerated: false });
    const totalRatingSum = allProductReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Math.round((totalRatingSum / allProductReviews.length) * 10) / 10;

    await db.products.updateById(productId, {
      averageRating: avgRating,
      reviewCount: allProductReviews.length
    });

    res.status(201).json({
      success: true,
      message: 'Verified review submitted successfully!',
      review: newReview,
      productRating: {
        averageRating: avgRating,
        reviewCount: allProductReviews.length
      }
    });
  } catch (error: any) {
    console.error('Review submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

export default router;
