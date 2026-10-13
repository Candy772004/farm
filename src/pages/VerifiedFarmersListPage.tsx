import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Award, ArrowRight, Sprout } from 'lucide-react';
import { api } from '../services/api';

export const VerifiedFarmersListPage: React.FC = () => {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFarmers() {
      try {
        const res = await api.get('/farmers/public');
        if (res.data?.success) {
          setFarmers(res.data.farmers);
        }
      } catch (err) {
        console.error('Failed to load verified farmers', err);
      } finally {
        setLoading(false);
      }
    }
    loadFarmers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Directory of Verified Farmers
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Every producer listed below has had their land ownership and chemical-free agricultural standards independently vetted.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-stone-500">Loading verified growers...</div>
      ) : farmers.length === 0 ? (
        <div className="text-center py-16 text-xs text-stone-500">No verified growers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farmers.map((f) => (
            <div
              key={f._id}
              className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {f.farmName[0]}
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFIED</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-stone-900 text-base">{f.farmName}</h3>
                  <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{f.location.city}, {f.location.state} · {f.totalAcreage} Acres</span>
                  </p>
                </div>

                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                  {f.bio}
                </p>

                {/* Verified badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(f.farmingPractices || []).slice(0, 3).map((practice: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[11px] font-medium"
                    >
                      {practice}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <Link
                  to={`/farmers/${f._id}`}
                  className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <span>View Farm & Produce</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
