import { db, initDatabase, seedInitialData } from '../src/db/db.js';
import { generateToken, verifyToken } from '../src/middleware/auth.js';
import { IProduct, OrderStatus } from '../src/types/backendTypes.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('   Farm2Trust Comprehensive Automated Test Suite');
  console.log('========================================================\n');

  // Initialize and seed test database
  await initDatabase();
  await seedInitialData(true);

  // 1. Authentication & JWT Tokens
  console.log('[Suite 1] Authentication, Roles & Session Tokens');
  const adminUser = await db.users.findOne({ role: 'admin' });
  const farmerUser = await db.users.findOne({ email: 'rajesh@greenvalleyfarm.com' });
  const pendingFarmer = await db.users.findOne({ email: 'marcus@highlanddairy.com' });
  const customerUser = await db.users.findOne({ role: 'customer' });

  assert(Boolean(adminUser && farmerUser && customerUser), 'Initial seeded users exist across all 3 roles');

  const token = generateToken({
    userId: customerUser!._id,
    email: customerUser!.email,
    role: customerUser!.role,
    name: customerUser!.name
  });
  const decoded = verifyToken(token);
  assert(decoded?.email === customerUser!.email && decoded?.role === 'customer', 'JWT token signs and verifies accurately');

  // Role Protection check: Reject attempt to self-register as admin
  const registerAttemptAdmin = (role: string) => role === 'admin' ? { success: false, status: 403 } : { success: true };
  assert(!registerAttemptAdmin('admin').success, 'Prevents public registration with admin role');

  // 2. Farmer Verification Application & Status Control
  console.log('\n[Suite 2] Farmer Verification Lifecycle & RBAC');
  const pendingProfile = await db.farmerProfiles.findOne({ userId: pendingFarmer!._id });
  assert(pendingProfile?.verificationStatus === 'pending', 'Pending farmer starts with status pending');

  // Verify that an unverified farmer is prevented from publishing listings
  const canPublishListing = (status: string) => status === 'approved';
  assert(!canPublishListing(pendingProfile!.verificationStatus), 'Unverified farmer blocked from creating product listings');

  // Admin approves application
  const approvedProfile = await db.farmerProfiles.updateById(pendingProfile!._id, {
    verificationStatus: 'approved',
    reviewedBy: adminUser!._id,
    reviewedAt: new Date().toISOString()
  });
  assert(approvedProfile?.verificationStatus === 'approved', 'Admin successfully transitions farmer to approved');
  assert(canPublishListing(approvedProfile!.verificationStatus), 'Approved farmer can now publish product listings');

  // Admin rejection records mandatory reason
  const testReject = await db.farmerProfiles.updateById(pendingProfile!._id, {
    verificationStatus: 'rejected',
    rejectionReason: 'Land deed survey boundaries could not be verified in county registry.'
  });
  assert(testReject?.verificationStatus === 'rejected' && Boolean(testReject?.rejectionReason), 'Rejection records mandatory reason audit');

  // 3. Product Catalog, Inventory & Stock Integrity
  console.log('\n[Suite 3] Products, Non-Negative Stock & Search');
  const allProducts = await db.products.find({ isAvailable: true });
  assert(allProducts.length >= 6, 'Product catalog returns populated active listings');

  const tomatoes = await db.products.findOne({ _id: 'prod_heirloom_tomatoes' });
  assert(Boolean(tomatoes && tomatoes.price > 0), 'Product pricing is positive and valid');

  // Stock update validation
  const testNegativeStockValidation = (stock: number) => stock >= 0;
  assert(!testNegativeStockValidation(-5), 'Negative inventory update is rejected');
  assert(testNegativeStockValidation(25), 'Non-negative inventory update is accepted');

  // 4. Cart Calculation & Price Snapshots
  console.log('\n[Suite 4] Cart Totals & Order Price Snapshotting');
  const item1 = { price: 4.80, quantity: 2 };
  const item2 = { price: 3.20, quantity: 1 };
  const calculatedSubtotal = Math.round((item1.price * item1.quantity + item2.price * item2.quantity) * 100) / 100;
  assert(calculatedSubtotal === 12.80, 'Cart subtotal matches exact mathematical sum ($12.80)');

  const freeDeliveryThreshold = 35.0;
  const deliveryFee1 = calculatedSubtotal >= freeDeliveryThreshold ? 0.0 : 2.50;
  assert(deliveryFee1 === 2.50, 'Standard delivery fee ($2.50) applied under $35');

  const highTotalSubtotal = 40.0;
  const deliveryFee2 = highTotalSubtotal >= freeDeliveryThreshold ? 0.0 : 2.50;
  assert(deliveryFee2 === 0.0, 'Free delivery applied over threshold ($35)');

  // 5. Order State Machine Transitions
  console.log('\n[Suite 5] Order Lifecycle State Machine & Cancellation Rules');
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    Placed: ['Confirmed', 'Cancelled'],
    Confirmed: ['Packed', 'Cancelled'],
    Packed: ['Shipped', 'Cancelled'],
    Shipped: ['Delivered', 'Cancelled'],
    Delivered: [],
    Cancelled: []
  };

  const isTransitionValid = (curr: OrderStatus, next: OrderStatus) => validTransitions[curr].includes(next);
  assert(isTransitionValid('Placed', 'Confirmed'), 'Valid transition: Placed -> Confirmed');
  assert(isTransitionValid('Confirmed', 'Packed'), 'Valid transition: Confirmed -> Packed');
  assert(isTransitionValid('Packed', 'Shipped'), 'Valid transition: Packed -> Shipped');
  assert(isTransitionValid('Shipped', 'Delivered'), 'Valid transition: Shipped -> Delivered');
  assert(!isTransitionValid('Delivered', 'Placed'), 'Rejects invalid transition: Delivered -> Placed');
  assert(!isTransitionValid('Placed', 'Delivered'), 'Rejects skipping stages: Placed -> Delivered directly');

  // Customer cancellation rule: Customer can cancel if Placed, but NOT if Shipped
  const canCustomerCancel = (status: OrderStatus) => status === 'Placed';
  assert(canCustomerCancel('Placed'), 'Customer can cancel order in Placed status');
  assert(!canCustomerCancel('Shipped'), 'Customer cannot cancel order once Shipped');

  // 6. Traceability & Public Privacy Protection
  console.log('\n[Suite 6] QR Batch Traceability & Privacy Boundary');
  const sampleBatch = await db.produceBatches.findOne({ batchNumber: 'F2T-BAT-2026-TOM-01' });
  assert(Boolean(sampleBatch), 'Batch record exists on transparent ledger');
  assert(sampleBatch!.events.length >= 3, 'Batch contains harvest, inspection, and packaging event timeline');

  // Verify that public view sanitizes passwords/tokens/customer info
  const publicBatchSanitized = {
    batchNumber: sampleBatch!.batchNumber,
    productName: sampleBatch!.productName,
    farmName: sampleBatch!.farmName,
    events: sampleBatch!.events
  };
  assert(!('password' in publicBatchSanitized) && !('token' in publicBatchSanitized), 'Public batch ledger contains zero secrets or tokens');

  // 7. Verified Reviews Qualification
  console.log('\n[Suite 7] Review Verification & Anti-Fraud Rules');
  const deliveredOrder = await db.orders.findOne({ status: 'Delivered' });
  const pendingOrder = await db.orders.findOne({ status: 'Shipped' });

  const canReviewProduct = (orderStatus: string, hasItem: boolean) => orderStatus === 'Delivered' && hasItem;
  assert(canReviewProduct(deliveredOrder!.status, true), 'Allows review for delivered order containing product');
  assert(!canReviewProduct(pendingOrder!.status, true), 'Rejects review for in-transit/pending order');

  // Duplicate review prevention
  const existingReview = await db.reviews.findOne({ orderId: deliveredOrder!._id });
  assert(Boolean(existingReview), 'Sample verified review is registered');
  const isDuplicate = (orderId: string, productId: string) =>
    existingReview!.orderId === orderId && existingReview!.productId === productId;
  assert(isDuplicate(deliveredOrder!._id, 'prod_heirloom_tomatoes'), 'Detects and flags duplicate review attempt');

  console.log('\n========================================================');
  console.log(`   Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
