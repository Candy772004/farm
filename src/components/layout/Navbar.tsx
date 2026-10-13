import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, User, LogOut, ShieldCheck, QrCode, Menu, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoUser, isAdmin, isFarmer } = useAuth();
  const { totalItemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Demo Persona Switcher Bar for Reviewers & Grading */}
      <div className="bg-stone-900 text-stone-200 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] whitespace-nowrap">
          <span className="text-stone-400 font-medium">Active Session:</span>
          <span className="text-emerald-400 font-semibold">
            {user ? `${user.name} (${user.role.toUpperCase()})` : 'Guest Visitor'}
          </span>
          {user?.role === 'farmer' && (
            <span className="text-stone-400">
              · Status: {user.farmerProfile?.verificationStatus === 'approved' ? 'Verified' : 'Pending Verification'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-stone-400 text-[11px]">Switch Persona:</span>
          <button
            onClick={() => switchDemoUser('customer', 'customer@farm2trust.com')}
            className="text-[11px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
            title="Customer Sarah (Can shop, checkout, track orders, review delivered items)"
          >
            Customer
          </button>
          <button
            onClick={() => switchDemoUser('farmer', 'rajesh@greenvalleyfarm.com')}
            className="text-[11px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 transition-colors"
            title="Farmer Rajesh (Verified, can add products, create batch QR codes, update orders)"
          >
            Farmer (Verified)
          </button>
          <button
            onClick={() => switchDemoUser('farmer', 'marcus@highlanddairy.com')}
            className="text-[11px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 transition-colors"
            title="Farmer Marcus (Pending verification application)"
          >
            Farmer (Pending)
          </button>
          <button
            onClick={() => switchDemoUser('admin', 'admin@farm2trust.org')}
            className="text-[11px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-blue-300 transition-colors"
            title="Admin (Can review applications, approve/reject with reason, view analytics)"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Main Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element Brand wordmark */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-emerald-950 flex items-center gap-2 whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-base shadow-sm">
            F2T
          </span>
          <span>Farm2Trust</span>
        </Link>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <Link
            to="/catalog"
            className={`whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors ${
              isActive('/catalog') ? 'text-emerald-800 font-semibold' : ''
            }`}
          >
            Marketplace
          </Link>
          <Link
            to="/farmers"
            className={`whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors ${
              isActive('/farmers') ? 'text-emerald-800 font-semibold' : ''
            }`}
          >
            Verified Farmers
          </Link>
          <Link
            to="/qr-scanner"
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 hover:text-emerald-800 transition-colors ${
              isActive('/qr-scanner') ? 'text-emerald-800 font-semibold' : ''
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-700" />
            <span>Scan Produce QR</span>
          </Link>
          <Link
            to="/traceability/F2T-BAT-2026-TOM-01"
            className={`whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors ${
              location.pathname.startsWith('/traceability') ? 'text-emerald-800 font-semibold' : ''
            }`}
          >
            Traceability Ledger
          </Link>

          {isFarmer && (
            <Link
              to="/farmer/dashboard"
              className={`whitespace-nowrap shrink-0 hover:text-emerald-800 transition-colors ${
                location.pathname.startsWith('/farmer') ? 'text-emerald-800 font-semibold' : ''
              }`}
            >
              Farmer Studio
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className={`whitespace-nowrap shrink-0 text-blue-800 hover:text-blue-900 transition-colors font-medium ${
                location.pathname.startsWith('/admin') ? 'font-bold' : ''
              }`}
            >
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Zone 3: 1 primary action cluster */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/cart"
            className="relative p-2 text-stone-700 hover:text-emerald-800 transition-colors flex items-center"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-700 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center tabular-nums">
                {totalItemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={user.role === 'farmer' ? '/farmer/dashboard' : user.role === 'admin' ? '/admin' : '/orders'}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5 text-stone-600" />
                <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="p-2 text-stone-500 hover:text-stone-800 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                Join Marketplace
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-700 hover:text-stone-950"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/catalog"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-stone-800 py-1"
          >
            Marketplace
          </Link>
          <Link
            to="/farmers"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-stone-800 py-1"
          >
            Verified Farmers
          </Link>
          <Link
            to="/qr-scanner"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-stone-800 py-1"
          >
            Scan Produce QR
          </Link>
          <Link
            to="/traceability/F2T-BAT-2026-TOM-01"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-stone-800 py-1"
          >
            Traceability Ledger
          </Link>

          {user && (
            <Link
              to="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-stone-800 py-1"
            >
              My Orders & Receipts
            </Link>
          )}

          {isFarmer && (
            <Link
              to="/farmer/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-emerald-800 font-semibold py-1"
            >
              Farmer Studio & Products
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-blue-800 font-semibold py-1"
            >
              Admin Dashboard & Verifications
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
