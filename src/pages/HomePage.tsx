import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, QrCode, ArrowRight, CheckCircle2, Star, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';
import { api } from '../services/api';
import { IProduct, ICategory } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { useCart } from '../context/CartContext';

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<IProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          api.get('/products/categories'),
          api.get('/products?limit=6')
        ]);
        if (catRes.data?.success) setCategories(catRes.data.categories);
        if (prodRes.data?.success) setFeaturedProducts(prodRes.data.products);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/catalog');
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-stone-50 to-emerald-50/40 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/80 text-emerald-900 rounded-full text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>100% Verified Regenerative & Organic Family Farms</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-[1.1] text-balance">
                Fresh From Farms, <br className="hidden sm:inline" />
                <span className="text-emerald-800">Direct to You.</span>
              </h1>

              <p className="text-base sm:text-lg text-stone-600 max-w-xl leading-relaxed">
                Cut out intermediaries. Buy hand-picked produce directly from vetted local growers, with verifiable QR batch traceability from harvest dawn to your doorstep.
              </p>

              {/* Direct Search Form */}
              <form onSubmit={handleSearch} className="max-w-xl flex flex-col sm:flex-row gap-2 pt-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search heirloom tomatoes, strawberries, honey..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm shrink-0 flex items-center justify-center gap-2"
                >
                  <span>Find Fresh Produce</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Category Quick Links */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-stone-500">
                <span className="font-medium text-stone-700">Popular:</span>
                {categories.slice(0, 4).map((cat) => (
                  <Link
                    key={cat._id}
                    to={`/catalog?category=${cat._id}`}
                    className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Hero Image Showcase Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xl overflow-hidden">
                <div className="relative aspect-[4/3] bg-stone-100">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80"
                    alt="Vine-ripened tomatoes fresh from Green Valley Farm"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-900 shadow-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Harvested 36 hrs ago</span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-emerald-800">Green Valley Organic Agro</span>
                    <span>Nashik Valley</span>
                  </div>

                  <h3 className="text-lg font-bold text-stone-900">
                    Vine-Ripened Heirloom Tomatoes
                  </h3>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <div>
                      <span className="text-xs text-stone-500 block">Direct Farmer Price</span>
                      <span className="text-xl font-bold text-stone-900 tabular-nums">$4.80</span>
                      <span className="text-xs text-stone-500"> / kg</span>
                    </div>

                    <Link
                      to="/traceability/F2T-BAT-2026-TOM-01"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                    >
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      <span>Inspect Traceability</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Browse Produce by Category
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Hand-picked directly from orchard trees, organic soil beds, and pasture fields.
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/catalog?category=${cat._id}`}
              className="group p-4 bg-white border border-stone-200 rounded-xl hover:border-emerald-700 hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors flex items-center justify-center font-bold text-base">
                {cat.name[0]}
              </div>
              <span className="font-semibold text-xs sm:text-sm text-stone-900 group-hover:text-emerald-900 line-clamp-1">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Fresh Harvest Produce */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Featured Available Produce
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Currently in stock and ready for direct farm dispatch.
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <span>Full Catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-stone-100 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <div
                key={product._id}
                className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <Link to={`/products/${product._id}`} className="block relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {product.isOrganicCertified && (
                    <div className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-900 shadow-sm">
                      Certified Organic
                    </div>
                  )}
                  {product.stockQuantity <= 10 && (
                    <div className="absolute bottom-3 left-3 bg-amber-900/90 text-white px-2 py-0.5 rounded text-[11px] font-medium shadow-sm">
                      Only {product.stockQuantity} left
                    </div>
                  )}
                </Link>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                      <span className="font-medium text-emerald-800 truncate">{product.farmName}</span>
                      <span className="flex items-center gap-1 text-stone-700">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums font-semibold">{product.averageRating}</span>
                      </span>
                    </div>

                    <Link to={`/products/${product._id}`}>
                      <h3 className="font-bold text-stone-900 hover:text-emerald-800 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-stone-900 tabular-nums">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-stone-500"> / {product.unit}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {product.batchNumber && (
                        <Link
                          to={`/traceability/${product.batchNumber}`}
                          className="p-2 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-stone-200"
                          title="View Traceability Batch"
                        >
                          <QrCode className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => addItem(product, 1)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-sm"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="bg-stone-100/70 border-y border-stone-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              How Farm2Trust Works
            </h2>
            <p className="text-sm text-stone-600 mt-2">
              A transparent protocol eliminating food broker markups and ensuring true field provenance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-sm">
                01
              </div>
              <h3 className="font-bold text-stone-900 text-base">Vetted Farm Verification</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Before listing, farmers submit land deed records, water testing certificates, and organic standards for administrative review.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-sm">
                02
              </div>
              <h3 className="font-bold text-stone-900 text-base">Direct Customer Orders</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Customers order directly with live inventory reservation. Fair prices ensure farmers earn genuine income without middlemen cuts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white font-bold flex items-center justify-center text-sm">
                03
              </div>
              <h3 className="font-bold text-stone-900 text-base">Scannable Batch Traceability</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Each shipment carries a unique QR code. Scan with any camera to inspect harvest time, soil conditions, and transit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* QR Traceability Explainer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-950 text-white rounded-2xl p-8 sm:p-12 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/80 rounded-full text-xs font-medium text-emerald-300">
              <QrCode className="w-4 h-4" />
              <span>Public Traceability Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Every Produce Crate Has a Digital Story
            </h2>
            <p className="text-sm text-stone-300 leading-relaxed">
              Supermarket labels often say &quot;organic&quot; with zero proof. Farm2Trust batches record dawn harvest logs, chromatography residue tests, and packhouse climate stamps.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/traceability/F2T-BAT-2026-TOM-01"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Inspect Sample Batch Ledger
              </Link>
              <Link
                to="/qr-scanner"
                className="px-5 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-stone-200 text-xs font-semibold rounded-lg transition-colors border border-emerald-800"
              >
                Open Camera Scanner
              </Link>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl text-stone-900 text-center shrink-0 w-64 shadow-md">
            <div className="w-44 h-44 mx-auto bg-stone-100 rounded-lg flex items-center justify-center p-2 border border-stone-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  'https://farm2trust.app/traceability/F2T-BAT-2026-TOM-01'
                )}`}
                alt="Sample Batch QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="block text-xs font-bold text-stone-800 mt-2">
              BATCH-2026-TOM-01
            </span>
            <span className="text-[11px] text-stone-500">Scan to inspect verification</span>
          </div>
        </div>
      </section>
    </div>
  );
};
