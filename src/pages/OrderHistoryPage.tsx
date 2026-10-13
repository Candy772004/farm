import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  Star,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { api } from '../services/api';
import { IOrder, OrderStatus } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { useAuth } from '../context/AuthContext';

const STAGE_ORDER: OrderStatus[] = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];

export const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState('');
  const { user } = useAuth();
  const location = useLocation();

  const loadOrders = async () => {
    try {
      const res = await api.get('/orders/customer');
      if (res.data?.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancelOrder = async () => {
    if (!cancelModalOrderId) return;
    setActionError('');
    try {
      const res = await api.post(`/orders/${cancelModalOrderId}/cancel`, {
        reason: cancelReason || 'Customer requested cancellation prior to harvest'
      });
      if (res.data?.success) {
        setCancelModalOrderId(null);
        setCancelReason('');
        await loadOrders();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to cancel order.');
    }
  };

  const getStageIndex = (status: OrderStatus) => {
    if (status === 'Cancelled') return -1;
    return STAGE_ORDER.indexOf(status);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
            My Orders & Farm Deliveries
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Track real-time harvest and transit state machine lifecycle.
          </p>
        </div>
        <Link
          to="/catalog"
          className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors self-start sm:self-auto"
        >
          Shop More Produce
        </Link>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-stone-500 text-xs">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-900 text-base">No Orders Placed Yet</h3>
          <p className="text-xs text-stone-500">
            When you purchase directly from verified growers, your tracking receipt and timeline will show here.
          </p>
          <Link
            to="/catalog"
            className="inline-block px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const currentStageIdx = getStageIndex(order.status);
            const isCancelled = order.status === 'Cancelled';

            return (
              <div
                key={order._id}
                className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="bg-stone-50/80 px-6 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-stone-400 block font-mono text-[10px]">ORDER NUMBER</span>
                    <span className="font-bold text-stone-900 font-mono">{order.orderNumber}</span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px]">DATE PLACED</span>
                    <span className="font-medium text-stone-800">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px]">TOTAL AMOUNT</span>
                    <span className="font-bold text-stone-900 tabular-nums">
                      ${order.totalAmount.toFixed(2)} ({order.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Mock Card'})
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px]">STATUS</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* State Machine Visual Stepper */}
                {!isCancelled ? (
                  <div className="px-6 py-5 border-b border-stone-100 bg-white">
                    <div className="flex items-center justify-between relative max-w-3xl mx-auto">
                      {/* Connection bar */}
                      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-stone-200 z-0" />
                      <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-emerald-600 transition-all z-0"
                        style={{
                          width: `${(Math.max(0, currentStageIdx) / (STAGE_ORDER.length - 1)) * 100}%`
                        }}
                      />

                      {STAGE_ORDER.map((stage, idx) => {
                        const isCompleted = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        return (
                          <div key={stage} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                isCompleted
                                  ? 'bg-emerald-700 text-white shadow-sm'
                                  : 'bg-stone-200 text-stone-500'
                              } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                            >
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span
                              className={`text-[11px] mt-1 font-medium whitespace-nowrap ${
                                isCurrent ? 'text-emerald-900 font-bold' : 'text-stone-500'
                              }`}
                            >
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-3 bg-rose-50/60 border-b border-rose-100 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>
                      Order was cancelled. Reason: {order.cancellationReason || 'Cancelled by user.'} Inventory was returned to the farm.
                    </span>
                  </div>
                )}

                {/* Item list */}
                <div className="p-6 divide-y divide-stone-100">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                          <ImageWithFallback
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">{item.productName}</h4>
                          <span className="text-xs text-stone-500">
                            {item.quantity} {item.unit} × ${item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <span className="font-bold text-stone-900 text-sm tabular-nums">
                          ${item.subtotal.toFixed(2)}
                        </span>

                        {item.batchNumber && (
                          <Link
                            to={`/traceability/${item.batchNumber}`}
                            className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-stone-200"
                            title="Inspect Batch Provenance"
                          >
                            <QrCode className="w-4 h-4" />
                          </Link>
                        )}

                        {order.status === 'Delivered' && (
                          <Link
                            to={`/products/${item.productId}`}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                          >
                            Review
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with Actions and Delivery Details */}
                <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
                  <div>
                    <span>Delivery Address: </span>
                    <span className="font-medium text-stone-800">
                      {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                      {order.shippingAddress.postalCode}
                    </span>
                  </div>

                  {order.status === 'Placed' && (
                    <button
                      onClick={() => setCancelModalOrderId(order._id)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Dialog */}
      {cancelModalOrderId && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Cancel Order Confirmation</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Orders can only be cancelled while in &quot;Placed&quot; status before the farmer begins morning harvesting and custom packaging.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule changed, ordered wrong quantity"
                className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrderId(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg hover:bg-stone-100"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
