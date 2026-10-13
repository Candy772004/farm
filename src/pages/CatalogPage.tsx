import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Star, QrCode, SlidersHorizontal, Check, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { IProduct, ICategory } from '../types';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { useCart } from '../context/CartContext';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const { addItem } = useCart();

  // URL Query sync
  const search = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'newest';
  const organicOnly = searchParams.get('organicOnly') === 'true';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get('/products/categories');
        if (res.data?.success) setCategories(res.data.categories);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params: any = {
          page,
          limit: 12,
          sort
        };
        if (search) params.search = search;
        if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
        if (organicOnly) params.organicOnly = 'true';
        if (inStockOnly) params.inStockOnly = 'true';

        const res = await api.get('/products', { params });
        if (res.data?.success) {
          setProducts(res.data.products);
          setPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch products', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [search, selectedCategory, sort, organicOnly, inStockOnly, page]);

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.set('page', '1'); // reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput.trim() || null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Farm Fresh Produce Catalogue
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Direct purchase from verified family farms with cryptographic batch provenance.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by crop, farm, or description..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-colors"
            />
          </form>

          {/* Sort Selection */}
          <div className="md:col-span-3">
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="w-full py-2 px-3 text-xs font-medium bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="newest">Sort: Newest Harvest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Fast Toggle Flags */}
          <div className="md:col-span-4 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={organicOnly}
                onChange={(e) => updateParam('organicOnly', e.target.checked ? 'true' : null)}
                className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
              />
              <span>Certified Organic</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => updateParam('inStockOnly', e.target.checked ? 'true' : null)}
                className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700"
              />
              <span>In-Stock Only</span>
            </label>
          </div>
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-stone-100 text-xs">
          <button
            onClick={() => updateParam('category', 'all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-800 text-white font-semibold shadow-sm'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            All Produce ({pagination.total})
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => updateParam('category', cat._id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat._id
                  ? 'bg-emerald-800 text-white font-semibold shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-stone-100 rounded-xl h-72 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center max-w-lg mx-auto space-y-3">
          <p className="text-base font-semibold text-stone-800">No produce matching your criteria</p>
          <p className="text-xs text-stone-500">
            Try adjusting your search keywords, clearing filters, or browsing other categories.
          </p>
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="px-4 py-2 bg-emerald-800 text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <Link to={`/products/${product._id}`} className="block relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <ImageWithFallback
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {product.isOrganicCertified && (
                    <div className="absolute top-2.5 left-2.5 bg-white/95 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-900 shadow-sm">
                      Organic
                    </div>
                  )}
                  {product.stockQuantity === 0 ? (
                    <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider">
                      Sold Out
                    </div>
                  ) : product.stockQuantity <= 10 ? (
                    <div className="absolute bottom-2.5 left-2.5 bg-amber-900/90 text-white px-2 py-0.5 rounded text-[10px] font-medium shadow-sm">
                      {product.stockQuantity} {product.unit} left
                    </div>
                  ) : null}
                </Link>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-emerald-800 truncate">{product.farmName}</span>
                    <span className="flex items-center gap-1 text-stone-700">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="tabular-nums font-semibold">{product.averageRating}</span>
                    </span>
                  </div>

                  <Link to={`/products/${product._id}`}>
                    <h3 className="font-bold text-stone-900 hover:text-emerald-800 transition-colors line-clamp-1 text-sm">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-stone-900 tabular-nums">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-stone-500"> / {product.unit}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {product.batchNumber && (
                      <Link
                        to={`/traceability/${product.batchNumber}`}
                        className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-stone-200"
                        title="View Batch QR Traceability"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      onClick={() => addItem(product, 1)}
                      disabled={product.stockQuantity === 0}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                    >
                      {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => updateParam('page', String(page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
          >
            Previous
          </button>
          <span className="text-xs text-stone-600 px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => updateParam('page', String(page + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
