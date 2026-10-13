import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { VerifiedFarmersListPage } from './pages/VerifiedFarmersListPage';
import { FarmerPublicProfilePage } from './pages/FarmerPublicProfilePage';
import { CartCheckoutPage } from './pages/CartCheckoutPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { TraceabilityPage } from './pages/TraceabilityPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { FarmerDashboardPage } from './pages/FarmerDashboardPage';
import { FarmerVerificationPage } from './pages/FarmerVerificationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-stone-900 font-sans selection:bg-emerald-200 selection:text-emerald-950">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/farmers" element={<VerifiedFarmersListPage />} />
                <Route path="/farmers/:id" element={<FarmerPublicProfilePage />} />
                <Route path="/cart" element={<CartCheckoutPage />} />
                <Route path="/orders" element={<OrderHistoryPage />} />
                <Route path="/traceability/:batchNumber" element={<TraceabilityPage />} />
                <Route path="/qr-scanner" element={<QRScannerPage />} />
                <Route path="/farmer/dashboard" element={<FarmerDashboardPage />} />
                <Route path="/farmer/verification" element={<FarmerVerificationPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
