import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  QrCode,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { IProduct, IOrder, IProduceBatch, ICategory, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const FarmerDashboardPage: React.FC = () => {
  const { user, isFarmerApproved } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'batches'>('overview');

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [batches, setBatches] = useState<IProduceBatch[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);

  // New product form modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('kg');
  const [prodStock, setProdStock] = useState('50');
  const [prodHarvestDate, setProdHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [prodOrganic, setProdOrganic] = useState(true);
  const [prodError, setProdError] = useState('');

  // Quick Stock Edit Modal
  const [editingStockProduct, setEditingStockProduct] = useState<IProduct | null>(null);
  const [newStockVal, setNewStockVal] = useState('');

  // Create Batch Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchProductId, setBatchProductId] = useState('');
  const [batchHarvestDate, setBatchHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchVariety, setBatchVariety] = useState('');
  const [batchPesticideFree, setBatchPesticideFree] = useState(true);
  const [batchSoilPractices, setBatchSoilPractices] = useState('Deep compost bed, natural stream irrigation');
  const [batchError, setBatchError] = useState('');

  // Order status update state
  const [statusUpdateNote, setStatusUpdateNote] = useState('');

  const loadFarmerData = async () => {
    try {
      const [analyticsRes, prodRes, ordersRes, batchesRes, catRes] = await Promise.all([
        api.get('/farmers/analytics'),
        api.get('/products?limit=50'),
        api.get('/orders/farmer'),
        api.get('/traceability/farmer/batches'),
        api.get('/products/categories')
      ]);

      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.analytics);
      if (prodRes.data?.success) {
        // Filter to products belonging to this farmer
        setProducts(prodRes.data.products.filter((p: any) => p.farmerId === user?._id));
      }
      if (ordersRes.data?.success) setOrders(ordersRes.data.orders);
      if (batchesRes.data?.success) setBatches(batchesRes.data.batches);
      if (catRes.data?.success) setCategories(catRes.data.categories);
    } catch (err) {
      console.error('Failed to load farmer studio data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmerData();
  }, [user]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError('');
    try {
      const res = await api.post('/products', {
        name: prodName,
        description: prodDesc,
        categoryId: prodCat || categories[0]?._id,
        price: Number(prodPrice),
        unit: prodUnit,
        stockQuantity: Number(prodStock),
        harvestDate: prodHarvestDate,
        isOrganicCertified: prodOrganic
      });

      if (res.data?.success) {
        setShowProductModal(false);
        setProdName('');
        setProdDesc('');
        setProdPrice('');
        await loadFarmerData();
      }
    } catch (err: any) {
      setProdError(err.response?.data?.message || 'Failed to create product listing.');
    }
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockProduct) return;
    try {
      await api.put(`/products/${editingStockProduct._id}`, {
        stockQuantity: Number(newStockVal)
      });
      setEditingStockProduct(null);
      await loadFarmerData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update inventory.');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError('');
    try {
      const res = await api.post('/traceability/batches', {
        productId: batchProductId || products[0]?._id,
        harvestDate: batchHarvestDate,
        variety: batchVariety,
        pesticideFreeTested: batchPesticideFree,
        soilAndWaterPractices: batchSoilPractices
      });

      if (res.data?.success) {
        setShowBatchModal(false);
        setBatchVariety('');
        await loadFarmerData();
      }
    } catch (err: any) {
      setBatchError(err.response?.data?.message || 'Failed to generate traceability batch.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, {
        nextStatus,
        note: statusUpdateNote || `Farmer updated order to ${nextStatus}`
      });
      if (res.data?.success) {
        setStatusUpdateNote('');
        await loadFarmerData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  if (!isFarmerApproved) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Farmer Verification Required</h2>
        <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
          Your account is currently in &quot;{user?.farmerProfile?.verificationStatus || 'pending'}&quot; status.
          Only approved and verified farms can list crops, manage inventory, and process customer orders.
        </p>
        <Link
          to="/farmer/verification"
          className="inline-block px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-sm"
        >
          View Verification Application
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
              Farmer Studio & Operations
            </h1>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>VERIFIED FARM</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {user?.farmerProfile?.farmName} · Manage produce listings, incoming orders, and QR batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Crop Listing</span>
          </button>
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Generate Batch QR</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'overview'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'products'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Produce Listings ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'orders'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Incoming Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'batches'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Traceability Batches ({batches.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-stone-500">Gross Sales Revenue</span>
              <div className="text-2xl font-bold text-stone-900 tabular-nums">
                ${analytics?.totalRevenue?.toFixed(2) || '0.00'}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">100% direct to farm</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-stone-500">Active Customer Orders</span>
              <div className="text-2xl font-bold text-stone-900 tabular-nums">
                {analytics?.activeOrdersCount || 0}
              </div>
              <span className="text-[11px] text-stone-500">Awaiting packaging or transit</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-stone-500">Fulfilled Deliveries</span>
              <div className="text-2xl font-bold text-stone-900 tabular-nums">
                {analytics?.completedOrdersCount || 0}
              </div>
              <span className="text-[11px] text-stone-500">Verified doorstep completion</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-stone-500">Inventory Status</span>
              <div className="text-2xl font-bold text-stone-900 tabular-nums">
                {products.length} Crops
              </div>
              <span className="text-[11px] text-amber-700 font-medium">
                {analytics?.lowStockAlerts || 0} low stock alerts
              </span>
            </div>
          </div>

          {/* Quick Action Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-stone-900 text-sm">Recent Incoming Orders</h3>
              {orders.slice(0, 3).map((o) => (
                <div key={o._id} className="p-3 bg-stone-50 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-stone-900 font-mono block">{o.orderNumber}</span>
                    <span className="text-stone-500">{o.customerName} · {o.items.length} items</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-stone-900 block tabular-nums">${o.totalAmount.toFixed(2)}</span>
                    <span className="text-emerald-700 font-semibold">{o.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-bold text-stone-900 text-sm">Traceability Batch Summary</h3>
              {batches.slice(0, 3).map((b) => (
                <div key={b._id} className="p-3 bg-stone-50 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-900 font-mono block">{b.batchNumber}</span>
                    <span className="text-stone-500">{b.productName} · {new Date(b.harvestDate).toLocaleDateString()}</span>
                  </div>
                  <Link
                    to={`/traceability/${b.batchNumber}`}
                    className="p-1.5 text-stone-600 hover:text-emerald-800"
                    title="View QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">My Active Produce Listings</h3>
            <button
              onClick={() => setShowProductModal(true)}
              className="px-3 py-1.5 bg-emerald-800 text-white text-xs font-semibold rounded-lg"
            >
              Add New Crop
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {products.map((p) => (
              <div key={p._id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                    <ImageWithFallback src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{p.name}</h4>
                    <span className="text-stone-500">{p.categoryName} · Harvested: {p.harvestDate || 'Daily'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-stone-400 block text-[10px]">PRICE</span>
                    <span className="font-bold text-stone-900 tabular-nums">
                      ${p.price.toFixed(2)} / {p.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px]">CURRENT STOCK</span>
                    <span className={`font-bold tabular-nums ${p.stockQuantity <= 10 ? 'text-amber-700' : 'text-stone-900'}`}>
                      {p.stockQuantity} {p.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingStockProduct(p);
                        setNewStockVal(String(p.stockQuantity));
                      }}
                      className="px-2.5 py-1 border border-stone-300 rounded hover:bg-stone-50 font-medium text-stone-700"
                    >
                      Update Stock
                    </button>
                    {p.batchNumber && (
                      <Link
                        to={`/traceability/${p.batchNumber}`}
                        className="p-1 text-stone-500 hover:text-emerald-800"
                        title="QR Ledger"
                      >
                        <QrCode className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-3">
                <div>
                  <span className="font-bold text-stone-900 font-mono text-sm">{o.orderNumber}</span>
                  <span className="text-stone-500 ml-2">Customer: {o.customerName}</span>
                </div>
                <div>
                  <span className="px-2.5 py-1 rounded-full font-bold text-emerald-800 bg-emerald-50">
                    {o.status}
                  </span>
                </div>
              </div>

              {/* Items in order */}
              <div className="space-y-1">
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-stone-700">
                    <span>{it.quantity} {it.unit} × {it.productName}</span>
                    <span className="font-semibold tabular-nums">${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100">
                <span className="text-stone-500">
                  Address: {o.shippingAddress.street}, {o.shippingAddress.city}
                </span>

                {/* State Machine Transition Actions */}
                <div className="flex items-center gap-2">
                  {o.status === 'Placed' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(o._id, 'Confirmed')}
                      className="px-3 py-1 bg-emerald-800 text-white rounded font-semibold"
                    >
                      Confirm Harvest
                    </button>
                  )}
                  {o.status === 'Confirmed' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(o._id, 'Packed')}
                      className="px-3 py-1 bg-emerald-800 text-white rounded font-semibold"
                    >
                      Mark Packed
                    </button>
                  )}
                  {o.status === 'Packed' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(o._id, 'Shipped')}
                      className="px-3 py-1 bg-emerald-800 text-white rounded font-semibold"
                    >
                      Dispatch / Shipped
                    </button>
                  )}
                  {o.status === 'Shipped' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(o._id, 'Delivered')}
                      className="px-3 py-1 bg-emerald-800 text-white rounded font-semibold"
                    >
                      Confirm Doorstep Delivery
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Batches */}
      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((b) => (
            <div key={b._id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-900 text-sm">{b.batchNumber}</span>
                <span className="text-stone-400">{new Date(b.harvestDate).toLocaleDateString()}</span>
              </div>

              <p className="font-bold text-stone-900 text-sm">{b.productName}</p>

              {b.qrCodeDataUrl && (
                <div className="w-36 h-36 mx-auto bg-stone-50 p-2 border border-stone-200 rounded-xl">
                  <img src={b.qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-stone-500">{b.events?.length || 1} logged events</span>
                <Link
                  to={`/traceability/${b.batchNumber}`}
                  className="px-3 py-1 bg-emerald-800 text-white rounded font-semibold"
                >
                  View Ledger
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900">List New Fresh Harvest Crop</h3>

            {prodError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {prodError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Produce Name</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Crisp Butterhead Lettuce"
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Category</label>
                <select
                  value={prodCat}
                  onChange={(e) => setProdCat(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="3.50"
                    className="w-full p-2.5 border border-stone-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Unit</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="bunch">bunch</option>
                    <option value="litre">litre</option>
                    <option value="crate">crate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Growing soil conditions, taste profile, and storage recommendations..."
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={prodOrganic}
                  onChange={(e) => setProdOrganic(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-800"
                />
                <span className="font-semibold text-stone-800">Certified Organic Produce</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-semibold"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Edit Modal */}
      {editingStockProduct && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Update Stock for {editingStockProduct.name}
            </h3>
            <form onSubmit={handleUpdateStock} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Available Quantity ({editingStockProduct.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-sm font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStockProduct(null)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 text-white rounded-lg font-bold"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Batch QR Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900">
              Generate Produce Traceability Batch QR
            </h3>

            {batchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {batchError}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Select Crop</label>
                <select
                  value={batchProductId}
                  onChange={(e) => setBatchProductId(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.farmName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Harvest Date</label>
                <input
                  type="date"
                  required
                  value={batchHarvestDate}
                  onChange={(e) => setBatchHarvestDate(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Seed Variety / Cultivar</label>
                <input
                  type="text"
                  value={batchVariety}
                  onChange={(e) => setBatchVariety(e.target.value)}
                  placeholder="e.g. Heritage Romanesco"
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Soil & Water Notes</label>
                <input
                  type="text"
                  value={batchSoilPractices}
                  onChange={(e) => setBatchSoilPractices(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={batchPesticideFree}
                  onChange={(e) => setBatchPesticideFree(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-800"
                />
                <span className="font-semibold text-stone-800">
                  Lab chromatography 0% chemical residue verified
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold"
                >
                  Generate QR Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
