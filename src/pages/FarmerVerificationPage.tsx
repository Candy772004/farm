import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Clock, CheckCircle2, FileText, ArrowRight, Upload } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FarmerVerificationPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [farmName, setFarmName] = useState('');
  const [totalAcreage, setTotalAcreage] = useState('15');
  const [farmingPractices, setFarmingPractices] = useState('Certified Organic, Drip Irrigation, Crop Rotation');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [doc1Title, setDoc1Title] = useState('State Organic Certification #AGR-2026');
  const [doc1Url, setDoc1Url] = useState('https://docs.farm2trust.org/certs/organic-license.pdf');
  const [doc2Title, setDoc2Title] = useState('Agricultural Land Title & Deed Registration');
  const [doc2Url, setDoc2Url] = useState('https://docs.farm2trust.org/land/deed-survey.pdf');

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = async () => {
    try {
      const res = await api.get('/farmers/profile');
      if (res.data?.success) {
        setProfile(res.data.profile);
        setFarmName(res.data.profile.farmName || '');
        setTotalAcreage(String(res.data.profile.totalAcreage || 15));
        setCity(res.data.profile.location?.city || '');
        setState(res.data.profile.location?.state || '');
      }
    } catch (err) {
      console.error('Failed to load farmer profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setSubmitting(true);

    try {
      const documents = [
        { title: doc1Title, type: 'organic_cert', url: doc1Url },
        { title: doc2Title, type: 'land_record', url: doc2Url }
      ];

      const res = await api.post('/farmers/verification', {
        farmName,
        totalAcreage: Number(totalAcreage),
        farmingPractices: farmingPractices.split(',').map(s => s.trim()),
        location: {
          address: 'Farm Field Plot',
          city,
          state,
          country: 'United States'
        },
        documents
      });

      if (res.data?.success) {
        setStatusMessage('Application submitted successfully! Your credentials are now in the Administrator review queue.');
        await loadProfile();
        await refreshUser();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit verification application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-xs text-stone-500">
        Loading verification status...
      </div>
    );
  }

  const status = profile?.verificationStatus || 'not_submitted';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          Farmer Verification & Farm Credentialing
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          To protect customers and genuine growers, only approved farms can list crops and process payments.
        </p>
      </div>

      {/* Status Notice Card */}
      <div
        className={`p-6 rounded-2xl border ${
          status === 'approved'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : status === 'pending'
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : status === 'rejected'
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : 'bg-stone-50 border-stone-200 text-stone-900'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
            {status === 'approved' && <ShieldCheck className="w-6 h-6 text-emerald-700" />}
            {status === 'pending' && <Clock className="w-6 h-6 text-amber-600" />}
            {status === 'rejected' && <AlertCircle className="w-6 h-6 text-rose-600" />}
            {status === 'not_submitted' && <FileText className="w-6 h-6 text-stone-600" />}
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base">
              Verification Status: <span className="uppercase">{status}</span>
            </h3>
            {status === 'approved' && (
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your farm credentials have been audited and verified by platform administrators. You are authorized to list products, create batch QR codes, and receive direct customer payments.
              </p>
            )}
            {status === 'pending' && (
              <p className="text-xs text-amber-800 leading-relaxed">
                Your application and submitted documents are under active review by the governance team. Reviews typically complete within 24 hours.
              </p>
            )}
            {status === 'rejected' && (
              <div className="text-xs text-rose-800 space-y-1">
                <p>Your previous verification was rejected. Reason recorded by reviewer:</p>
                <div className="p-2 bg-white/80 rounded border border-rose-200 font-semibold">
                  &quot;{profile?.rejectionReason || 'Incomplete agricultural deed or documentation.'}&quot;
                </div>
                <p>You may correct the details below and re-submit for approval.</p>
              </div>
            )}
            {status === 'not_submitted' && (
              <p className="text-xs text-stone-600 leading-relaxed">
                Please provide your farm identity, acreage, and supporting documentation below to apply for market producer status.
              </p>
            )}
          </div>
        </div>

        {status === 'approved' && (
          <div className="mt-4 pt-4 border-t border-emerald-200/60 flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-medium">Ready to sell produce?</span>
            <Link
              to="/farmer/dashboard"
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg transition-colors"
            >
              Go to Farmer Studio
            </Link>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Application Form */}
      {status !== 'approved' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            {status === 'rejected' ? 'Re-Submit Verification Evidence' : 'Farm Application Form'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Registered Farm Name</label>
              <input
                type="text"
                required
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Green Valley Agro & Organic Farm"
                className="w-full p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Total Acreage</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={totalAcreage}
                  onChange={(e) => setTotalAcreage(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">City / Region</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Hood River"
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">State / Province</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Oregon"
                  className="w-full p-2.5 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Farming Methodologies (Comma separated)
              </label>
              <input
                type="text"
                required
                value={farmingPractices}
                onChange={(e) => setFarmingPractices(e.target.value)}
                placeholder="e.g. Certified Organic, Zero Chemical Pesticides, Solar Powered"
                className="w-full p-2.5 border border-stone-300 rounded-lg"
              />
            </div>

            {/* Document Evidence Section */}
            <div className="border-t border-stone-100 pt-4 space-y-3">
              <h3 className="font-bold text-stone-800 text-sm">Supporting Documents & Certificates</h3>
              <p className="text-[11px] text-stone-500">
                Provide legitimate references to governmental land registrations or agricultural testing lab certificates.
              </p>

              <div className="p-3 bg-stone-50 rounded-xl space-y-2 border border-stone-200/80">
                <span className="font-semibold text-stone-700 block">Document 1: Organic / Standards Certificate</span>
                <input
                  type="text"
                  required
                  value={doc1Title}
                  onChange={(e) => setDoc1Title(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Certificate title & registration number"
                />
                <input
                  type="url"
                  required
                  value={doc1Url}
                  onChange={(e) => setDoc1Url(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono text-[11px]"
                  placeholder="https://..."
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-2 border border-stone-200/80">
                <span className="font-semibold text-stone-700 block">Document 2: Land Deed / Operation Lease</span>
                <input
                  type="text"
                  required
                  value={doc2Title}
                  onChange={(e) => setDoc2Title(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Land Title & Property Survey record"
                />
                <input
                  type="url"
                  required
                  value={doc2Url}
                  onChange={(e) => setDoc2Url(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono text-[11px]"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition-colors"
              >
                {submitting ? 'Submitting Application...' : 'Submit for Administrator Audit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
