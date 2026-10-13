import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  QrCode,
  Star,
  CheckCircle2,
  Calendar,
  MapPin,
  ArrowLeft,
  Truck,
  Leaf,
  Clock,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { IProduct, IProduceBatch, IFarmerProfile, IReview } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<IProduct | null>(null);
  const [farmer, setFarmer] = useState<IFarmerProfile | null>(null);
  const [batch, setBatch] = useState<IProduceBatch | null>(null);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQty, setSelectedQty] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderNumber, setReviewOrderNumber] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { addItem } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    async function loadProductData() {
      if (!id) return;
      setLoading(true);
      try {
        const [prodRes, revRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/reviews/product/${id}`)
        ]);

        if (prodRes.data?.success) {
          setProduct(prodRes.data.product);
          setFarmer(prodRes.data.farmer);
          setBatch(prodRes.data.batch);
        }
        if (revRes.data?.success) {
          setReviews(revRes.data.reviews);
        }
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    }
    loadProductData();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selectedQty);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewError('');
    setReviewSubmitting(true);

    try {
      // Find a delivered customer order matching this order number or lookup customer's orders
      const orderRes = await api.get('/orders/customer');
      const deliveredOrders = orderRes.data?.orders?.filter(
        (o: any) => o.status === 'Delivered' && o.items.some((i: any) => i.productId === product._id)
      ) || [];

      if (deliveredOrders.length === 0) {
        setReviewError('No eligible delivered orders found for this product. You can only review produce from completed orders you have received.');
        setReviewSubmitting(false);
        return;
      }

      // Pick matching or latest delivered order
      const targetOrder = reviewOrderNumber
        ? deliveredOrders.find((o: any) => o.orderNumber === reviewOrderNumber.trim()) || deliveredOrders[0]
        : deliveredOrders[0];

      const res = await api.post('/reviews', {
        productId: product._id,
        orderId: targetOrder._id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment
      });

      if (res.data?.success) {
        setReviews([res.data.review, ...reviews]);
        setProduct((prev) =>
          prev ? { ...prev, averageRating: res.data.productRating.averageRating, reviewCount: res.data.productRating.reviewCount } : null
        );
        setShowReviewModal(false);
        setReviewTitle('');
        setReviewComment('');
      }
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-stone-500">Loading produce details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Product Not Found</h2>
        <p className="text-sm text-stone-500">This listing may have been deactivated or sold out.</p>
        <Link
          to="/catalog"
          className="inline-block px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold"
        >
          Return to Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb Navigation */}
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-emerald-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Produce Catalogue</span>
      </Link>

      {/* Main PDP Grid: Gallery Left, Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Product Imagery and Traceability Callout */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-[4/3] bg-stone-100 rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <ImageWithFallback
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.isOrganicCertified && (
              <div className="absolute top-4 left-4 bg-white/95 px-3 py-1 rounded-md text-xs font-semibold text-emerald-900 shadow-sm flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                <span>Certified Organic</span>
              </div>
            )}
          </div>

          {/* Batch Provenance Card */}
          {product.batchNumber && (
            <div className="bg-emerald-950 text-white p-6 rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
                  <QrCode className="w-4 h-4" />
                  <span>Verifiable Harvest Batch</span>
                </div>
                <h4 className="font-bold text-lg text-white">Batch {product.batchNumber}</h4>
                <p className="text-xs text-stone-300 max-w-md">
                  Harvested: {product.harvestDate || 'Fresh batch'}. Zero cold-chain artificial ripening.
                </p>
              </div>

              <Link
                to={`/traceability/${product.batchNumber}`}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm flex items-center gap-2"
              >
                <span>Inspect Full Ledger</span>
                <QrCode className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Producer Story & Transparency */}
          {farmer && (
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                    Cultivating Farm
                  </span>
                  <h4 className="text-lg font-bold text-stone-900">{farmer.farmName}</h4>
                </div>
                <div className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Producer</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">{farmer.bio}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-stone-100">
                <div>
                  <span className="text-stone-400 block">Location</span>
                  <span className="font-medium text-stone-800">
                    {farmer.location.city}, {farmer.location.state}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Cultivation Area</span>
                  <span className="font-medium text-stone-800 tabular-nums">
                    {farmer.totalAcreage} Acres
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block">Practices</span>
                  <span className="font-medium text-stone-800">
                    {farmer.farmingPractices[0] || 'Sustainable'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/farmers/${farmer._id}`}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1"
                >
                  <span>View Complete Farmer Profile & Field Story</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{product.categoryName}</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {product.averageRating}
                  </span>
                  <span className="text-stone-400">({product.reviewCount} verified reviews)</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-bold text-stone-900 tabular-nums">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-stone-500">per {product.unit}</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-4">
              {product.description}
            </p>

            {/* Inventory Status */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    product.stockQuantity > 0 ? 'bg-emerald-600' : 'bg-rose-500'
                  }`}
                />
                <span className="font-medium text-stone-800">
                  {product.stockQuantity > 0
                    ? `In Stock (${product.stockQuantity} ${product.unit} available)`
                    : 'Currently Out of Stock'}
                </span>
              </div>
              <span className="text-stone-500">Direct From Farm</span>
            </div>

            {/* Quantity Selector and Purchase CTA */}
            {product.stockQuantity > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="qty-select" className="text-xs font-semibold text-stone-700">
                    Order Quantity ({product.unit})
                  </label>
                  <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 text-sm font-bold"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold text-stone-900 tabular-nums">
                      {selectedQty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedQty(Math.min(product.stockQuantity, selectedQty + 1))
                      }
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <span>
                      Add {selectedQty} {product.unit} to Cart · $
                      {(product.price * selectedQty).toFixed(2)}
                    </span>
                  </button>

                  {addedNotice && (
                    <div className="mt-2 text-center text-xs font-semibold text-emerald-800 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200 animate-fadeIn">
                      ✓ Added to shopping cart!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Direct Logistics Reassurance */}
            <div className="border-t border-stone-100 pt-4 space-y-2.5 text-xs text-stone-500">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                <span>Next-day courier dispatch from harvest farm</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Cash on Delivery or Verified Mock Escrow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-xl font-bold text-stone-900">
              Verified Customer Reviews
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Only customers with verified delivered orders can submit feedback.
            </p>
          </div>

          {user && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Write a Verified Review</span>
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            No reviews submitted yet for this produce batch.
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-stone-100">
            {reviews.map((rev) => (
              <div key={rev._id} className="pt-4 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{rev.customerName}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded">
                      Verified Buyer
                    </span>
                  </div>
                  <span className="text-stone-400 text-[11px]">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-stone-800 ml-1.5">{rev.title}</span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900">
              Review &quot;{product.name}&quot;
            </h3>
            <p className="text-xs text-stone-500">
              Your feedback is linked directly to your completed delivered purchase.
            </p>

            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-400 focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Review Headline
                </label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Incredibly sweet and fresh"
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Comments & Taste Experience
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe the freshness, aroma, packaging, and condition upon delivery..."
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {reviewSubmitting ? 'Verifying...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
