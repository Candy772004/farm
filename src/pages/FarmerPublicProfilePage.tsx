import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Award, Sprout, ArrowLeft, Star, QrCode } from 'lucide-react';
import { api } from '../services/api';
import { IFarmerProfile, IProduct } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { useCart } from '../context/CartContext';

export const FarmerPublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [farmer, setFarmer] = useState<any | null>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    async function loadFarmer() {
      if (!id) return;
      try {
        const res = await api.get(`/farmers/public/${id}`);
        if (res.data?.success) {
          setFarmer(res.data.farmer);
          setProducts(res.data.products);
        }
      } catch (err) {
        console.error('Failed to load farmer profile', err);
      } finally {
        setLoading(false);
      }
    }
    loadFarmer();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-stone-500">
        Loading farmer profile...
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="text-xl font-bold text-stone-900">Farmer Not Found</h2>
        <p className="text-xs text-stone-500">This producer profile may not be approved yet.</p>
        <Link to="/farmers" className="inline-block px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold">
          View All Verified Farmers
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Link
        to="/farmers"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-emerald-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Verified Farmers</span>
      </Link>

      {/* Header Banner */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{farmer.farmName}</h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Organic Producer</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>{farmer.location.city}, {farmer.location.state}, {farmer.location.country}</span>
              <span>·</span>
              <span>{farmer.totalAcreage} Cultivated Acres</span>
            </p>
          </div>
        </div>

        <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
          {farmer.bio}
        </p>

        {/* Verified Credentials */}
        <div className="border-t border-stone-100 pt-4">
          <span className="text-xs font-bold text-stone-800 block mb-2">
            Verified Certifications on Record
          </span>
          <div className="flex flex-wrap gap-2">
            {farmer.verifiedCertifications && farmer.verifiedCertifications.length > 0 ? (
              farmer.verifiedCertifications.map((cert: any, i: number) => (
                <div
                  key={i}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 flex items-center gap-2"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-medium">{cert.title}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-stone-500 italic">
                Regenerative family farming practices inspected by platform staff.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Produce Offered by this Farmer */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">
            Current Produce Harvested at {farmer.farmName}
          </h2>
          <span className="text-xs text-stone-500 tabular-nums">
            {products.length} Active Listings
          </span>
        </div>

        {products.length === 0 ? (
          <div className="p-8 bg-white border border-stone-200 rounded-xl text-center text-xs text-stone-500">
            No active listings available from this farm today. Next crop harvest scheduled soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((prod) => (
              <div
                key={prod._id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <Link to={`/products/${prod._id}`} className="block relative aspect-[4/3] bg-stone-100 overflow-hidden">
                    <ImageWithFallback
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>{prod.categoryName}</span>
                      <span className="flex items-center gap-1 text-stone-700">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-semibold tabular-nums">{prod.averageRating}</span>
                      </span>
                    </div>

                    <Link to={`/products/${prod._id}`}>
                      <h3 className="font-bold text-stone-900 text-sm hover:text-emerald-800 transition-colors line-clamp-1">
                        {prod.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-stone-500 line-clamp-2">{prod.description}</p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-stone-900 tabular-nums">
                        ${prod.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-stone-500"> / {prod.unit}</span>
                    </div>

                    <button
                      onClick={() => addItem(prod, 1)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-sm"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
