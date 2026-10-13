import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShieldCheck, ArrowRight, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const CartCheckoutPage: React.FC = () => {
  const { items, updateQuantity, removeItem, clearCart, subtotal, deliveryFee, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'mock_escrow_card'>('cash_on_delivery');
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);

  // New address state if user wants to enter one
  const [street, setStreet] = useState(user?.addresses?.[0]?.street || '742 Evergreen Terrace, Apt 4B');
  const [city, setCity] = useState(user?.addresses?.[0]?.city || 'Portland');
  const [state, setState] = useState(user?.addresses?.[0]?.state || 'Oregon');
  const [postalCode, setPostalCode] = useState(user?.addresses?.[0]?.postalCode || '97201');

  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!user) {
      navigate('/login?redirect=/cart');
      return;
    }

    setOrderError('');
    setSubmitting(true);

    try {
      const orderPayload = {
        items: items.map(item => ({
          productId: item.product._id,
          name: item.product.name,
          quantity: item.quantity
        })),
        shippingAddress: {
          street,
          city,
          state,
          postalCode,
          country: 'United States'
        },
        paymentMethod
      };

      const res = await api.post('/orders', orderPayload);

      if (res.data?.success) {
        clearCart();
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
        navigate('/orders', {
          state: { newOrderPlaced: true, orderNumber: res.data.order.orderNumber }
        });
      }
    } catch (err: any) {
      setOrderError(err.response?.data?.message || 'Failed to place order. Please review stock availability.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
          <Truck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Your Fresh Cart is Empty</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Explore today fresh morning harvests from verified family farms and add wholesome produce to your basket.
        </p>
        <Link
          to="/catalog"
          className="inline-block px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
        >
          Browse Farm Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          Shopping Cart & Farm Checkout
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Review your fresh harvest basket and confirm direct delivery address.
        </p>
      </div>

      {orderError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{orderError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Itemized Basket List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm divide-y divide-stone-100">
            {items.map(({ product, quantity }) => (
              <div key={product._id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                <div className="w-20 h-20 bg-stone-100 rounded-xl overflow-hidden shrink-0 border border-stone-200">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-800 block truncate">
                    {product.farmName}
                  </span>
                  <h4 className="font-bold text-stone-900 text-sm truncate">{product.name}</h4>
                  <div className="text-xs text-stone-500">
                    <span className="tabular-nums">${product.price.toFixed(2)}</span> / {product.unit}
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product._id, quantity - 1)}
                    className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 text-xs font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-bold text-stone-900 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product._id, quantity + 1)}
                    disabled={quantity >= product.stockQuantity}
                    className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-40 text-xs font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right shrink-0 min-w-[70px]">
                  <span className="block text-sm font-bold text-stone-900 tabular-nums">
                    ${(product.price * quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(product._id)}
                    className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Address Information */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Delivery Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  placeholder="e.g. 742 Evergreen Terrace, Apt 4B"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  placeholder="e.g. Portland"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">State / Province</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  placeholder="e.g. Oregon"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Postal / ZIP Code</label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  placeholder="e.g. 97201"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Country</label>
                <input
                  type="text"
                  disabled
                  value="United States"
                  className="w-full p-2.5 bg-stone-100 border border-stone-200 text-stone-500 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Order Summary and Checkout Action */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              Order Summary
            </h3>

            <div className="space-y-3 text-xs text-stone-600">
              <div className="flex items-center justify-between">
                <span>Produce Subtotal</span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Direct Farm Delivery Fee</span>
                <span className="font-semibold text-stone-900 tabular-nums">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE (Over $35)</span>
                  ) : (
                    `$${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-baseline justify-between text-base">
                <span className="font-bold text-stone-900">Total Payable</span>
                <span className="font-bold text-2xl text-stone-900 tabular-nums">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-stone-800">
                Payment Option
              </label>

              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-emerald-700 bg-emerald-50/50'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cash_on_delivery"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                    className="mt-0.5 text-emerald-800"
                  />
                  <div>
                    <span className="font-bold text-stone-900 block">Cash on Delivery (COD)</span>
                    <span className="text-stone-500 text-[11px]">
                      Inspect fresh produce quality upon doorstep arrival before paying.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    paymentMethod === 'mock_escrow_card'
                      ? 'border-emerald-700 bg-emerald-50/50'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="mock_escrow_card"
                    checked={paymentMethod === 'mock_escrow_card'}
                    onChange={() => setPaymentMethod('mock_escrow_card')}
                    className="mt-0.5 text-emerald-800"
                  />
                  <div>
                    <span className="font-bold text-stone-900 block">Verified Mock Escrow Card</span>
                    <span className="text-stone-500 text-[11px]">
                      Simulated secure card authorization. Funds released only upon delivery.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Reserving Inventory & Creating Order...' : 'Confirm & Place Order'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-stone-400 text-center leading-relaxed">
              Real inventory reservation with atomic stock decrement. Prices snapshotted at time of purchase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
