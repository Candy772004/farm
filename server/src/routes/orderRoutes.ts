import { Router } from 'express';
import { db } from '../db/db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { OrderStatus, IOrderItem, IOrderHistoryEvent } from '../types/backendTypes.js';

const router = Router();

// Allowed transitions state machine map
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Placed: ['Confirmed', 'Cancelled'],
  Confirmed: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  Delivered: [], // Terminal state
  Cancelled: []  // Terminal state
};

// POST /api/v1/orders - Place order
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
      return;
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      res.status(400).json({ success: false, message: 'Complete delivery address is required.' });
      return;
    }

    const customer = await db.users.findById(req.user!.userId);
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer account not found.' });
      return;
    }

    // Step 1: Validate stock for all items
    const validatedItems: IOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await db.products.findById(item.productId);
      if (!product || !product.isAvailable) {
        res.status(400).json({
          success: false,
          message: `Product "${item.name || 'Requested produce'}" is currently unavailable.`
        });
        return;
      }

      const reqQty = Number(item.quantity) || 1;
      if (reqQty <= 0) {
        res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
        return;
      }

      if (product.stockQuantity < reqQty) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} ${product.unit} available.`
        });
        return;
      }

      // Snapshot values at purchase time
      const itemSubtotal = Math.round(product.price * reqQty * 100) / 100;
      subtotal += itemSubtotal;

      validatedItems.push({
        productId: product._id,
        productName: product.name,
        price: product.price,
        unit: product.unit,
        quantity: reqQty,
        subtotal: itemSubtotal,
        image: product.images[0] || '',
        farmerId: product.farmerId,
        batchNumber: product.batchNumber
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    // Flat delivery fee of $2.50, waived for orders over $35
    const deliveryFee = subtotal >= 35.0 ? 0.0 : 2.50;
    const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;

    // Step 2: Atomic inventory decrement
    for (const item of validatedItems) {
      await db.products.updateById(item.productId, {
        $inc: { stockQuantity: -item.quantity }
      });
    }

    // Step 3: Create Order document
    const orderNumber = `F2T-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const initialHistory: IOrderHistoryEvent = {
      status: 'Placed',
      timestamp: new Date().toISOString(),
      actorRole: 'customer',
      actorId: customer._id,
      actorName: customer.name,
      note: `Order placed with payment: ${paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Mock Escrow Card'}`
    };

    const newOrder = await db.orders.insertOne({
      orderNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      items: validatedItems,
      subtotal,
      deliveryFee,
      totalAmount,
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || 'United States'
      },
      paymentMethod: paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'mock_escrow_card',
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
      status: 'Placed',
      statusHistory: [initialHistory],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: newOrder
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to process order.' });
  }
});

// GET /api/v1/orders/customer - Customer order history
router.get('/customer', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await db.orders.find({ customerId: req.user!.userId });
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer orders.' });
  }
});

// GET /api/v1/orders/farmer - Farmer incoming orders
router.get('/farmer', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user!.role !== 'farmer' && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const allOrders = await db.orders.find();
    // Filter orders that have items belonging to this farmer
    const farmerOrders = allOrders.filter(o =>
      req.user!.role === 'admin' || o.items.some(i => i.farmerId === req.user!.userId)
    );

    farmerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, orders: farmerOrders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch farmer orders.' });
  }
});

// GET /api/v1/orders/:id - Single order details
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await db.orders.findById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Authorization check: customer owner OR farmer with items in order OR admin
    const isCustomerOwner = order.customerId === req.user!.userId;
    const isFarmerOfItem = order.items.some(i => i.farmerId === req.user!.userId);
    const isAdmin = req.user!.role === 'admin';

    if (!isCustomerOwner && !isFarmerOfItem && !isAdmin) {
      res.status(403).json({ success: false, message: 'You are not authorized to view this order.' });
      return;
    }

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

// PATCH /api/v1/orders/:id/status - Update order lifecycle status
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { nextStatus, note } = req.body as { nextStatus: OrderStatus; note?: string };
    const order = await db.orders.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Role verification
    const isFarmer = order.items.some(i => i.farmerId === req.user!.userId);
    const isAdmin = req.user!.role === 'admin';

    if (!isFarmer && !isAdmin) {
      res.status(403).json({ success: false, message: 'Only the producing farmer or an administrator can update fulfillment status.' });
      return;
    }

    // Validate state machine transition
    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid state transition from "${order.status}" to "${nextStatus}". Allowed transitions: [${allowedNext.join(', ')}]`
      });
      return;
    }

    const historyEvent: IOrderHistoryEvent = {
      status: nextStatus,
      timestamp: new Date().toISOString(),
      actorRole: req.user!.role,
      actorId: req.user!.userId,
      actorName: req.user!.name,
      note: note || `Status updated to ${nextStatus}`
    };

    const updateData: any = {
      status: nextStatus,
      $push: { statusHistory: historyEvent }
    };

    if (nextStatus === 'Delivered') {
      updateData.paymentStatus = 'paid';
    }

    // If cancelled by farmer/admin, restore stock
    if (nextStatus === 'Cancelled') {
      updateData.cancellationReason = note || 'Cancelled by seller';
      updateData.cancelledBy = req.user!.name;
      for (const item of order.items) {
        await db.products.updateById(item.productId, {
          $inc: { stockQuantity: item.quantity }
        });
      }
    }

    const updated = await db.orders.updateById(order._id, updateData);

    res.json({
      success: true,
      message: `Order status transitioned to ${nextStatus}.`,
      order: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// POST /api/v1/orders/:id/cancel - Customer cancel eligible order
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    const order = await db.orders.findById(req.params.id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (order.customerId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'You can only cancel your own orders.' });
      return;
    }

    // Rule: Customer can only cancel if still in 'Placed' status
    if (order.status !== 'Placed' && req.user!.role !== 'admin') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel order at "${order.status}" stage. Orders can only be cancelled while in "Placed" status before farm harvest & packaging confirmation.`
      });
      return;
    }

    // Restore stock atomically
    for (const item of order.items) {
      await db.products.updateById(item.productId, {
        $inc: { stockQuantity: item.quantity }
      });
    }

    const cancelEvent: IOrderHistoryEvent = {
      status: 'Cancelled',
      timestamp: new Date().toISOString(),
      actorRole: req.user!.role,
      actorId: req.user!.userId,
      actorName: req.user!.name,
      note: reason || 'Cancelled by customer'
    };

    const updated = await db.orders.updateById(order._id, {
      status: 'Cancelled',
      cancellationReason: reason || 'Customer requested cancellation',
      cancelledBy: req.user!.name,
      $push: { statusHistory: cancelEvent }
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully. Stock has been returned to farmer inventory.',
      order: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
});

export default router;
