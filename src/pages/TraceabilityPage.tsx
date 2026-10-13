import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Calendar,
  MapPin,
  Award,
  Download,
  Printer,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { ImageWithFallback } from '../components/common/ImageWithFallback';

export const TraceabilityPage: React.FC = () => {
  const { batchNumber } = useParams<{ batchNumber: string }>();
  const [traceability, setTraceability] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBatchTraceability() {
      if (!batchNumber) return;
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/traceability/${batchNumber}`);
        if (res.data?.success) {
          setTraceability(res.data.traceability);
        } else {
          setError(res.data?.message || 'Batch not found.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Traceability batch record could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    fetchBatchTraceability();
  }, [batchNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!traceability?.qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = traceability.qrCodeDataUrl;
    a.download = `QR_${batchNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-stone-500">
        Querying Farm2Trust transparent ledger for batch {batchNumber}...
      </div>
    );
  }

  if (error || !traceability) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Batch Record Not Found</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          The requested identifier &quot;{batchNumber}&quot; is not registered on this ledger.
        </p>
        <Link
          to="/qr-scanner"
          className="inline-block px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold"
        >
          Open QR Scanner
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
          <button
            onClick={handleDownloadQr}
            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save QR</span>
          </button>
        </div>
      </div>

      {/* Main Batch Certificate Card */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden space-y-8 p-6 sm:p-8">
        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-stone-100 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Cryptographically Logged Harvest Batch</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
              {traceability.product.name}
            </h1>
            <p className="text-xs font-mono text-stone-500">
              BATCH ID: <span className="font-bold text-stone-900">{traceability.batchNumber}</span>
            </p>
          </div>

          {/* QR Box */}
          {traceability.qrCodeDataUrl && (
            <div className="flex flex-col items-center p-3 bg-stone-50 border border-stone-200 rounded-xl shrink-0">
              <img
                src={traceability.qrCodeDataUrl}
                alt={`Batch QR code for ${traceability.batchNumber}`}
                className="w-28 h-28 object-contain"
              />
              <span className="text-[10px] text-stone-500 font-mono mt-1">Direct Verification Link</span>
            </div>
          )}
        </div>

        {/* Origin & Cultivation Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-stone-50/70 p-5 rounded-xl border border-stone-200/80 text-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Origin & Farm Credentials
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-900">{traceability.origin.farmName}</p>
              <p className="text-stone-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>{traceability.origin.location}</span>
              </p>
              <p className="text-stone-600">Cultivator: {traceability.origin.farmerName}</p>
              <p className="text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Platform Verification: {traceability.origin.verificationStatus.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Harvest & Quality Analysis
            </span>
            <div className="space-y-1">
              <p className="text-stone-800">
                <span className="text-stone-500">Harvest Date: </span>
                <span className="font-semibold">{new Date(traceability.harvestDetails.harvestDate).toLocaleDateString()}</span>
              </p>
              {traceability.harvestDetails.variety && (
                <p className="text-stone-800">
                  <span className="text-stone-500">Seed Variety: </span>
                  <span className="font-medium">{traceability.harvestDetails.variety}</span>
                </p>
              )}
              <p className="text-stone-800">
                <span className="text-stone-500">Pesticide Residue: </span>
                <span className="font-semibold text-emerald-800">
                  {traceability.harvestDetails.pesticideFreeTested ? '0% Synthetic Residue Tested' : 'Standard sustainable crop'}
                </span>
              </p>
              <p className="text-stone-600 leading-relaxed pt-1">
                {traceability.origin.soilAndWaterPractices}
              </p>
            </div>
          </div>
        </div>

        {/* Official Certifications Claim vs Record */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-800" />
            <span>Documented Agricultural Standards</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {traceability.harvestDetails.certifications.map((cert: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{cert}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Timeline of Events (Journey Ledger) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-800" />
            <span>Batch Event Log (Field to Packhouse)</span>
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
            {traceability.events.map((event: any, idx: number) => (
              <div key={idx} className="relative space-y-1">
                {/* Marker */}
                <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-700 border-2 border-white ring-2 ring-emerald-100 flex items-center justify-center" />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-stone-900 text-sm">{event.title}</span>
                  <span className="text-stone-500 font-mono text-[11px]">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-stone-500 flex items-center gap-2">
                  <span>Location: {event.location}</span>
                  <span>·</span>
                  <span>Actor: {event.actor}</span>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 mt-1">
                  {event.details}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Honest Transparency Notice */}
        <div className="p-4 bg-stone-100 rounded-xl text-stone-600 text-xs space-y-1 border border-stone-200">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Farm2Trust Transparency & Verification Boundary</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {traceability.trustNotice.disclaimer} Batch data is linked directly to harvest records recorded by verified growers. Missing entries are highlighted rather than masked.
          </p>
        </div>
      </div>
    </div>
  );
};
