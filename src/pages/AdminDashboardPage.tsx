import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IProduct, IAuditLog } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'analytics' | 'catalog' | 'audit'>('applications');

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Dialog State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadAdminData = async () => {
    try {
      const [analyticsRes, appsRes, prodsRes, auditRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/applications'),
        api.get('/products?limit=50'),
        api.get('/admin/audit-logs')
      ]);

      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.metrics);
      if (appsRes.data?.success) setApplications(appsRes.data.applications);
      if (prodsRes.data?.success) setProducts(prodsRes.data.products);
      if (auditRes.data?.success) setAuditLogs(auditRes.data.logs);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setActionError('');
    setActionSubmitting(true);

    try {
      const res = await api.post(`/admin/applications/${selectedApp._id}/review`, {
        action: reviewAction,
        reason: reviewReason || (reviewAction === 'approve' ? 'All land records and organic credentials verified.' : 'Incomplete documentation.')
      });

      if (res.data?.success) {
        setSelectedApp(null);
        setReviewReason('');
        await loadAdminData();
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to process application review.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleToggleProduct = async (prodId: string) => {
    try {
      const res = await api.patch(`/admin/products/${prodId}/toggle`);
      if (res.data?.success) {
        await loadAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update product status.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Access Restricted</h2>
        <p className="text-xs text-stone-500">
          This portal is reserved for authorized platform administrators and auditors.
        </p>
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
              Platform Administration & Verification Portal
            </h1>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[11px] font-bold rounded">
              ADMIN GOVERNANCE
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Audit farmer applications, moderate produce listings, and inspect immutable action logs.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'applications'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Farmer Applications ({applications.filter(a => a.verificationStatus === 'pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'analytics'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Platform Analytics
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'catalog'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Listing Moderation ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-3 transition-colors ${
            activeTab === 'audit'
              ? 'text-emerald-800 border-b-2 border-emerald-800'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Administrative Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Farmer Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm divide-y divide-stone-100">
            {applications.map((app) => (
              <div key={app._id} className="p-6 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-base">{app.farmName}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          app.verificationStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.verificationStatus === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {app.verificationStatus}
                      </span>
                    </div>
                    <p className="text-stone-500">
                      Farmer: <span className="font-semibold text-stone-800">{app.farmerRealName}</span> ·{' '}
                      Email: {app.farmerEmail} · Location: {app.location?.city}, {app.location?.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {app.verificationStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewAction('approve');
                            setReviewReason('Inspected valid government title deed and organic test certification.');
                          }}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setReviewAction('reject');
                            setReviewReason('');
                          }}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Submitted Documents & Evidence */}
                <div className="bg-stone-50 p-4 rounded-xl space-y-2 border border-stone-200/80">
                  <span className="font-bold text-stone-700 block">Submitted Evidence Documents:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(app.documents || []).map((doc: any, i: number) => (
                      <div key={i} className="p-2.5 bg-white rounded-lg border border-stone-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-medium text-stone-800 truncate">{doc.title}</span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 shrink-0 ml-2"
                        >
                          <span>Inspect Doc</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-semibold">Gross Merchandise Value</span>
              <div className="text-3xl font-bold text-stone-900 tabular-nums">
                ${analytics.totalGMV.toFixed(2)}
              </div>
              <span className="text-xs text-emerald-700 font-medium">100% direct transactions</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-semibold">Total Orders</span>
              <div className="text-3xl font-bold text-stone-900 tabular-nums">
                {analytics.totalOrders}
              </div>
              <span className="text-xs text-stone-500">
                {analytics.deliveredOrders} delivered to doorstep
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-semibold">Verified Family Farms</span>
              <div className="text-3xl font-bold text-emerald-800 tabular-nums">
                {analytics.approvedFarmers}
              </div>
              <span className="text-xs text-amber-700 font-medium">
                {analytics.pendingApplications} applications pending
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-1">
              <span className="text-xs text-stone-500 font-semibold">Registered Customers</span>
              <div className="text-3xl font-bold text-stone-900 tabular-nums">
                {analytics.totalCustomers}
              </div>
              <span className="text-xs text-stone-500">Active households</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Catalog Moderation */}
      {activeTab === 'catalog' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between text-xs">
            <h3 className="font-bold text-stone-900">Manage Produce Listings</h3>
            <span className="text-stone-500">Admins can suspend suspicious listings instantly</span>
          </div>

          <div className="divide-y divide-stone-100">
            {products.map((p) => (
              <div key={p._id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{p.name}</h4>
                  <span className="text-stone-500">{p.farmName} · ${p.price.toFixed(2)} / {p.unit}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {p.isAvailable ? 'Active' : 'Suspended'}
                  </span>

                  <button
                    onClick={() => handleToggleProduct(p._id)}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      p.isAvailable
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {p.isAvailable ? 'Suspend Listing' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 text-xs font-bold text-stone-900">
            Immutable Administrative Audit Trail
          </div>

          <div className="divide-y divide-stone-100">
            {auditLogs.map((log) => (
              <div key={log._id} className="p-4 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-900">{log.action}</span>
                  <span className="text-stone-400 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-stone-600">
                  Actor: <span className="font-semibold text-stone-800">{log.actorEmail}</span> ({log.actorRole}) · Target: {log.targetEntity}
                </div>
                <div className="p-2 bg-stone-50 rounded border border-stone-200/60 font-mono text-[11px] text-stone-700">
                  {JSON.stringify(log.details)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-900">
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} {selectedApp.farmName}
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {actionError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Recorded Reason & Audit Notes (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Record verification notes or reasons for rejection..."
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 border border-stone-300 rounded-lg font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className={`px-4 py-2 text-white rounded-lg font-semibold shadow-sm ${
                    reviewAction === 'approve'
                      ? 'bg-emerald-800 hover:bg-emerald-900'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {actionSubmitting ? 'Recording...' : `Confirm ${reviewAction.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
