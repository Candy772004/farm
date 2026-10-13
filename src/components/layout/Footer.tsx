import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, Leaf, QrCode } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 text-sm">
      {/* Trust & Guarantee Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-stone-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">Direct From Verified Farmers</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Every farm profile is reviewed by administrators for land records and government organic standards before any produce can be listed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">End-to-End Batch Traceability</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Scan unique batch QR codes to view harvest dawn timestamps, farm location, lab pesticide residue checks, and transit logs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-400 shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">Fair Compensation, Zero Middlemen</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                100% of the produce purchase price goes directly to the cultivating farmer without commission deductions by wholesale brokers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <span className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                F2T
              </span>
              Farm2Trust
            </span>
            <p className="text-xs text-stone-400 mt-3 leading-relaxed">
              Transparent agricultural commerce empowering regenerative family farms and giving households honest, fresh nutrition.
            </p>
            <div className="mt-4 text-xs text-stone-400">
              <span>Production-Grade Architecture · MongoDB Verified</span>
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Marketplace</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li><Link to="/catalog" className="hover:text-white transition-colors">All Produce</Link></li>
              <li><Link to="/catalog?category=cat_vegetables" className="hover:text-white transition-colors">Fresh Vegetables</Link></li>
              <li><Link to="/catalog?category=cat_fruits" className="hover:text-white transition-colors">Tree-Ripened Fruits</Link></li>
              <li><Link to="/catalog?category=cat_dairy_eggs" className="hover:text-white transition-colors">Pasture Dairy & Eggs</Link></li>
              <li><Link to="/catalog?organicOnly=true" className="hover:text-white transition-colors">Certified Organic Only</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Integrity & Proof</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li><Link to="/farmers" className="hover:text-white transition-colors">Directory of Verified Farmers</Link></li>
              <li><Link to="/qr-scanner" className="hover:text-white transition-colors">Batch QR Scanner Tool</Link></li>
              <li><Link to="/traceability/F2T-BAT-2026-TOM-01" className="hover:text-white transition-colors">Sample Transparency Ledger</Link></li>
              <li><Link to="/farmer/verification" className="hover:text-white transition-colors">Farmer Verification Standards</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">For Producers</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li><Link to="/register?role=farmer" className="hover:text-white transition-colors">Register as a Farmer</Link></li>
              <li><Link to="/farmer/dashboard" className="hover:text-white transition-colors">Farmer Studio</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Producer Portal Login</Link></li>
              <li><Link to="/admin" className="hover:text-white transition-colors">Admin Governance</Link></li>
            </ul>
          </div>
        </div>

        {/* Quiet disclaimer and copyright */}
        <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© {new Date().getFullYear()} Farm2Trust Inc. All rights reserved.</p>
          <p className="text-center sm:text-right max-w-lg text-[11px] text-stone-400">
            QR codes accurately reflect registered timeline events and verified documents submitted by accredited third parties. Always review specific inspection records.
          </p>
        </div>
      </div>
    </footer>
  );
};
