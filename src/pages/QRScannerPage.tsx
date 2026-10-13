import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QrCode, Camera, Upload, ArrowRight, Search, CheckCircle2, ShieldCheck } from 'lucide-react';

export const QRScannerPage: React.FC = () => {
  const [manualBatchId, setManualBatchId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const navigate = useNavigate();

  const demoBatches = [
    {
      id: 'F2T-BAT-2026-TOM-01',
      title: 'Heirloom Vine Tomatoes (Green Valley Farm)',
      status: 'Dawn Harvest · Lab chromatography 0% pesticide'
    },
    {
      id: 'F2T-BAT-2026-STR-04',
      title: 'Wild Mountain Strawberries (Suncrest Orchards)',
      status: 'Glacier Stream Water · Bee-friendly pollination'
    },
    {
      id: 'F2T-BAT-2026-SPN-02',
      title: 'Hydro-Cooled Baby Spinach (Green Valley Farm)',
      status: 'Triple-rinsed · Packhouse cold chain 13°C'
    }
  ];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBatchId.trim()) return;
    const cleanId = manualBatchId.trim();
    navigate(`/traceability/${encodeURIComponent(cleanId)}`);
  };

  const handleSelectDemo = (batchId: string) => {
    navigate(`/traceability/${encodeURIComponent(batchId)}`);
  };

  const handleStartCamera = () => {
    setCameraActive(true);
    setScanMessage('Camera scanner initialized. Point your camera at any Farm2Trust batch QR code.');
    // Simulated camera decode for sandbox demonstration
    setTimeout(() => {
      setScanMessage('QR detected: F2T-BAT-2026-TOM-01. Redirecting to transparency ledger...');
      setTimeout(() => {
        navigate('/traceability/F2T-BAT-2026-TOM-01');
      }, 1200);
    }, 2800);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Scan Produce QR Code
        </h1>
        <p className="text-xs text-stone-500 leading-relaxed">
          Inspect genuine harvest timestamps, chemical-free testing logs, and journey tracking for any produce crate.
        </p>
      </div>

      {/* Main Scanner Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Camera Scanner Viewport */}
        <div className="bg-stone-950 text-white rounded-xl aspect-[16/9] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden border border-stone-800">
          {cameraActive ? (
            <div className="space-y-4">
              <div className="w-48 h-48 border-2 border-emerald-500 rounded-lg mx-auto relative flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2 shadow-lg" />
                <span className="text-[11px] text-emerald-300 font-mono z-10">Aligning QR frame...</span>
              </div>
              <p className="text-xs text-stone-300">{scanMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Camera className="w-10 h-10 text-stone-500 mx-auto" />
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Use your device camera to scan the QR printed on Farm2Trust eco-cartons or delivery receipts.
              </p>
              <button
                onClick={handleStartCamera}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Activate Camera Scanner</span>
              </button>
            </div>
          )}
        </div>

        {/* Manual Identifier Lookup */}
        <div className="border-t border-stone-100 pt-6 space-y-3">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Or Enter Batch ID Manually
          </h3>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={manualBatchId}
                onChange={(e) => setManualBatchId(e.target.value)}
                placeholder="e.g. F2T-BAT-2026-TOM-01"
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              Query Ledger
            </button>
          </form>
        </div>

        {/* Quick Testing: Sample Verified Batches */}
        <div className="border-t border-stone-100 pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Quick Test Sample Batches
            </h3>
            <span className="text-[11px] text-stone-400">Click to inspect immediately</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {demoBatches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectDemo(b.id)}
                className="p-3 bg-stone-50 hover:bg-emerald-50/60 border border-stone-200 hover:border-emerald-300 rounded-xl text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-900">{b.id}</span>
                    <span className="text-xs font-semibold text-stone-800">{b.title}</span>
                  </div>
                  <span className="text-[11px] text-stone-500 mt-0.5 block">{b.status}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-800 transition-colors shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
