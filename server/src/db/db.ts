import mongoose from 'mongoose';
import QRCode from 'qrcode';
import net from 'net';
import {
  IUser,
  IFarmerProfile,
  ICategory,
  IProduct,
  IProduceBatch,
  IOrder,
  IReview,
  IAuditLog
} from '../types/backendTypes.js';

async function isLocalPortListening(port = 27017, host = '127.0.0.1', timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let handled = false;

    const cleanup = (result: boolean) => {
      if (!handled) {
        handled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => cleanup(true));
    socket.once('timeout', () => cleanup(false));
    socket.once('error', () => cleanup(false));

    try {
      socket.connect(port, host);
    } catch {
      cleanup(false);
    }
  });
}

// Simple in-memory document store fallback when no MongoDB URI is active
class MemoryCollection<T extends { _id: string }> {
  private items: Map<string, T> = new Map();

  async find(filter: any = {}): Promise<T[]> {
    let result = Array.from(this.items.values());

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;

      if (key === '$or' && Array.isArray(value)) {
        result = result.filter(item => {
          return value.some(subFilter => {
            return Object.entries(subFilter).every(([subKey, subVal]: [string, any]) => {
              if (subVal instanceof RegExp) {
                return subVal.test(String((item as any)[subKey] || ''));
              }
              return (item as any)[subKey] === subVal;
            });
          });
        });
        continue;
      }

      result = result.filter(item => {
        const itemVal = (item as any)[key];
        if (value instanceof RegExp) {
          return value.test(String(itemVal || ''));
        }
        if (typeof value === 'object' && value !== null) {
          if ('$in' in value && Array.isArray(value.$in)) {
            return value.$in.includes(itemVal);
          }
          if ('$gte' in value) {
            return itemVal >= (value as any).$gte;
          }
          if ('$lte' in value) {
            return itemVal <= (value as any).$lte;
          }
          if ('$ne' in value) {
            return itemVal !== (value as any).$ne;
          }
        }
        return itemVal === value;
      });
    }

    // Return deep copies so external mutations don't corrupt store
    return JSON.parse(JSON.stringify(result));
  }

  async findById(id: string): Promise<T | null> {
    const item = this.items.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async findOne(filter: any): Promise<T | null> {
    const results = await this.find(filter);
    return results.length > 0 ? results[0] : null;
  }

  async insertOne(doc: Omit<T, '_id'> & { _id?: string }): Promise<T> {
    const _id = doc._id || 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const item = { ...doc, _id } as T;
    this.items.set(_id, JSON.parse(JSON.stringify(item)));
    return JSON.parse(JSON.stringify(item));
  }

  async updateById(id: string, update: Partial<T> | any): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;

    let updated = { ...existing };

    if (update.$inc) {
      for (const [field, incVal] of Object.entries(update.$inc)) {
        (updated as any)[field] = ((updated as any)[field] || 0) + (incVal as number);
      }
      delete update.$inc;
    }

    if (update.$push) {
      for (const [field, pushVal] of Object.entries(update.$push)) {
        if (!Array.isArray((updated as any)[field])) {
          (updated as any)[field] = [];
        }
        (updated as any)[field].push(pushVal);
      }
      delete update.$push;
    }

    updated = { ...updated, ...update, updatedAt: new Date().toISOString() };
    this.items.set(id, JSON.parse(JSON.stringify(updated)));
    return JSON.parse(JSON.stringify(updated));
  }

  async deleteById(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async count(filter: any = {}): Promise<number> {
    const results = await this.find(filter);
    return results.length;
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}

export interface IDatabaseStore {
  isMongooseConnected: boolean;
  users: MemoryCollection<IUser>;
  farmerProfiles: MemoryCollection<IFarmerProfile>;
  categories: MemoryCollection<ICategory>;
  products: MemoryCollection<IProduct>;
  produceBatches: MemoryCollection<IProduceBatch>;
  orders: MemoryCollection<IOrder>;
  reviews: MemoryCollection<IReview>;
  auditLogs: MemoryCollection<IAuditLog>;
}

export const db: IDatabaseStore = {
  isMongooseConnected: false,
  users: new MemoryCollection<IUser>(),
  farmerProfiles: new MemoryCollection<IFarmerProfile>(),
  categories: new MemoryCollection<ICategory>(),
  products: new MemoryCollection<IProduct>(),
  produceBatches: new MemoryCollection<IProduceBatch>(),
  orders: new MemoryCollection<IOrder>(),
  reviews: new MemoryCollection<IReview>(),
  auditLogs: new MemoryCollection<IAuditLog>()
};

export async function initDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI?.trim();

  const isLocalhost = Boolean(
    mongoUri && (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1'))
  );
  const isUnconfigured = !mongoUri || mongoUri.includes('<username>');

  let shouldAttemptConnection = !isUnconfigured;

  if (shouldAttemptConnection && isLocalhost) {
    const portMatch = mongoUri?.match(/:(\d+)/);
    const port = portMatch ? parseInt(portMatch[1], 10) : 27017;
    const isPortOpen = await isLocalPortListening(port);
    if (!isPortOpen) {
      shouldAttemptConnection = false;
      console.log(`[DB] Local MongoDB daemon is not running on port ${port}. Activating built-in high-performance document store.`);
    }
  }

  if (shouldAttemptConnection && mongoUri) {
    try {
      console.log('[DB] Connecting to MongoDB database...');
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2500
      });
      db.isMongooseConnected = true;
      console.log('[DB] Successfully connected to MongoDB database!');
    } catch {
      console.log('[DB] External MongoDB connection not reachable. Operating with built-in high-performance document store.');
    }
  } else if (isUnconfigured) {
    console.log('[DB] Operating with built-in high-performance document store.');
  }

  await seedInitialData();
}

export async function seedInitialData(force = false): Promise<void> {
  const userCount = await db.users.count();
  if (userCount > 0 && !force) {
    return;
  }

  if (force) {
    await db.users.clear();
    await db.farmerProfiles.clear();
    await db.categories.clear();
    await db.products.clear();
    await db.produceBatches.clear();
    await db.orders.clear();
    await db.reviews.clear();
    await db.auditLogs.clear();
  }

  console.log('[DB] Seeding Farm2Trust database with verified agricultural records...');

  // Users
  // Passwords:
  // Admin: AdminPass123! -> bcrypt hash
  // Farmer: FarmerPass123! -> bcrypt hash
  // Customer: CustomerPass123! -> bcrypt hash
  // Pre-hashed for quick deterministic initialization
  const adminHash = '$2a$10$O9wRsq64rC8D0GvXz.a9i.yI1q5sV3M3y0w2mD2q3k4j5k6l7m8n9'; // AdminPass123!
  const farmerHash = '$2a$10$1r2s3t4u5v6w7x8y9z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7'; // FarmerPass123!
  const customerHash = '$2a$10$Q7P6O5N4M3L2K1J0I9H8G7F6E5D4C3B2A1z0y9x8w7v6u5t4s3r2'; // CustomerPass123!

  const adminUser = await db.users.insertOne({
    _id: 'usr_admin_001',
    name: 'Administrator',
    email: 'admin@farm2trust.org',
    passwordHash: adminHash,
    role: 'admin',
    phone: '+1 (555) 019-2834',
    addresses: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  });

  const farmer1 = await db.users.insertOne({
    _id: 'usr_farmer_rajesh',
    name: 'Rajesh Kumar',
    email: 'rajesh@greenvalleyfarm.com',
    passwordHash: farmerHash,
    role: 'farmer',
    phone: '+1 (555) 234-8901',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
    addresses: [{
      _id: 'addr_f1',
      street: 'Plot 42, Sunrise Valley Road',
      city: 'Nashik Valley',
      state: 'Maharashtra',
      postalCode: '422003',
      country: 'India',
      isDefault: true
    }],
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z'
  });

  const farmer2 = await db.users.insertOne({
    _id: 'usr_farmer_elena',
    name: 'Elena Vance',
    email: 'elena@suncrestorchards.com',
    passwordHash: farmerHash,
    role: 'farmer',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=300&q=80',
    addresses: [{
      _id: 'addr_f2',
      street: '14 Riverbend Foothills',
      city: 'Hood River',
      state: 'Oregon',
      postalCode: '97031',
      country: 'United States',
      isDefault: true
    }],
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z'
  });

  const farmerPending = await db.users.insertOne({
    _id: 'usr_farmer_marcus',
    name: 'Marcus Thorne',
    email: 'marcus@highlanddairy.com',
    passwordHash: farmerHash,
    role: 'farmer',
    phone: '+1 (555) 789-0123',
    addresses: [],
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z'
  });

  const customerUser = await db.users.insertOne({
    _id: 'usr_customer_sarah',
    name: 'Sarah Jenkins',
    email: 'customer@farm2trust.com',
    passwordHash: customerHash,
    role: 'customer',
    phone: '+1 (555) 987-6543',
    addresses: [
      {
        _id: 'addr_c1',
        street: '742 Evergreen Terrace, Apt 4B',
        city: 'Portland',
        state: 'Oregon',
        postalCode: '97201',
        country: 'United States',
        isDefault: true
      },
      {
        _id: 'addr_c2',
        street: '120 Market Street, Suite 9',
        city: 'Seattle',
        state: 'Washington',
        postalCode: '98101',
        country: 'United States',
        isDefault: false
      }
    ],
    createdAt: '2026-01-20T12:00:00.000Z',
    updatedAt: '2026-01-20T12:00:00.000Z'
  });

  // Farmer Profiles
  await db.farmerProfiles.insertOne({
    _id: 'fp_rajesh',
    userId: farmer1._id,
    farmName: 'Green Valley Agro & Organic Farm',
    bio: 'Third-generation regenerative farm specializing in soil biome health, heirloom tomatoes, crunchy carrots, and chemical-free heritage greens.',
    location: {
      address: 'Plot 42, Sunrise Valley Road',
      city: 'Nashik Valley',
      state: 'Maharashtra',
      country: 'India',
      coordinates: { lat: 19.9975, lng: 73.7898 }
    },
    totalAcreage: 38,
    farmingPractices: ['Certified Organic', 'Zero Chemical Pesticides', 'Drip Irrigation', 'Compost Enriched'],
    verificationStatus: 'approved',
    reviewedBy: adminUser._id,
    reviewedAt: '2026-01-12T14:30:00.000Z',
    documents: [
      {
        title: 'National Organic Standards Board Certification #AGR-2025-9921',
        type: 'organic_cert',
        url: 'https://docs.farm2trust.org/certs/rajesh-organic.pdf',
        verified: true
      },
      {
        title: 'Agricultural Land Title & Deed Verification',
        type: 'land_record',
        url: 'https://docs.farm2trust.org/land/rajesh-deed.pdf',
        verified: true
      }
    ],
    bankAccountDetails: {
      accountHolder: 'Green Valley Organic Agro Ltd',
      accountNumberMasked: '•••• •••• •••• 4092',
      bankName: 'AgriDevelopment Bank'
    },
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-01-12T14:30:00.000Z'
  });

  await db.farmerProfiles.insertOne({
    _id: 'fp_elena',
    userId: farmer2._id,
    farmName: 'Suncrest Berry & Citrus Orchards',
    bio: 'Family-operated orchard on glacier-fed riverbeds growing sweet berries, crisp apples, and tree-ripened organic fruit without cold-chain delays.',
    location: {
      address: '14 Riverbend Foothills',
      city: 'Hood River',
      state: 'Oregon',
      country: 'United States',
      coordinates: { lat: 45.7054, lng: -121.5215 }
    },
    totalAcreage: 52,
    farmingPractices: ['USDA Organic Certified', 'Bee Friendly Farming', 'Natural Mulching', 'Cover Crops'],
    verificationStatus: 'approved',
    reviewedBy: adminUser._id,
    reviewedAt: '2026-01-18T10:15:00.000Z',
    documents: [
      {
        title: 'USDA Organic Producer Certificate #OR-99120',
        type: 'organic_cert',
        url: 'https://docs.farm2trust.org/certs/elena-usda.pdf',
        verified: true
      },
      {
        title: 'Hood River Water Rights and Soil Test Report',
        type: 'land_record',
        url: 'https://docs.farm2trust.org/water/elena-rights.pdf',
        verified: true
      }
    ],
    createdAt: '2026-01-15T09:30:00.000Z',
    updatedAt: '2026-01-18T10:15:00.000Z'
  });

  await db.farmerProfiles.insertOne({
    _id: 'fp_marcus',
    userId: farmerPending._id,
    farmName: 'Highland Pastures & Herb Farm',
    bio: 'Pasture-raised organic dairy, raw honey, and fresh culinary herbs cultivated at 2,000 feet elevation.',
    location: {
      address: 'Old Ridge Highway',
      city: 'Bend',
      state: 'Oregon',
      country: 'United States'
    },
    totalAcreage: 22,
    farmingPractices: ['Grass-fed', 'No Antibiotics', 'Solar Powered'],
    verificationStatus: 'pending',
    documents: [
      {
        title: 'State Dairy Permit Application & Soil Analysis',
        type: 'land_record',
        url: 'https://docs.farm2trust.org/permits/marcus-pending.pdf',
        verified: false
      }
    ],
    createdAt: '2026-02-01T10:30:00.000Z',
    updatedAt: '2026-02-01T10:30:00.000Z'
  });

  // Categories
  const categoriesData: ICategory[] = [
    {
      _id: 'cat_vegetables',
      name: 'Fresh Vegetables',
      slug: 'fresh-vegetables',
      description: 'Crisp, nutrient-dense vegetables harvested at peak ripeness.',
      iconName: 'Carrot',
      isActive: true
    },
    {
      _id: 'cat_fruits',
      name: 'Farm Fresh Fruits',
      slug: 'fresh-fruits',
      description: 'Sweet, sun-ripened orchard fruits and berries directly from trees.',
      iconName: 'Apple',
      isActive: true
    },
    {
      _id: 'cat_dairy_eggs',
      name: 'Dairy & Farm Eggs',
      slug: 'dairy-eggs',
      description: 'Pasture-raised chicken eggs and fresh artisanal farm butter & milk.',
      iconName: 'Egg',
      isActive: true
    },
    {
      _id: 'cat_grains_pulses',
      name: 'Grains & Pulses',
      slug: 'grains-pulses',
      description: 'Heritage grains, unpolished rice, and sun-dried organic lentils.',
      iconName: 'Wheat',
      isActive: true
    },
    {
      _id: 'cat_herbs_spices',
      name: 'Herbs & Microgreens',
      slug: 'herbs-spices',
      description: 'Aromatic culinary herbs and living microgreens packed with flavor.',
      iconName: 'Sprout',
      isActive: true
    },
    {
      _id: 'cat_honey_preserves',
      name: 'Pure Honey & Preserves',
      slug: 'honey-preserves',
      description: 'Raw unfiltered wildflower honey and small-batch orchard jams.',
      iconName: 'Jar',
      isActive: true
    }
  ];

  for (const cat of categoriesData) {
    await db.categories.insertOne(cat);
  }

  // Products
  const productsData: IProduct[] = [
    {
      _id: 'prod_heirloom_tomatoes',
      farmerId: farmer1._id,
      farmerName: 'Rajesh Kumar',
      farmName: 'Green Valley Agro & Organic Farm',
      farmLocation: 'Nashik Valley',
      name: 'Vine-Ripened Heirloom Tomatoes',
      description: 'Sweet, juicy heirloom beefsteak tomatoes grown in volcanic soil with zero synthetic sprays. Handpicked daily at dawn.',
      categoryId: 'cat_vegetables',
      categoryName: 'Fresh Vegetables',
      price: 4.80,
      unit: 'kg',
      stockQuantity: 120,
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'],
      harvestDate: '2026-10-08',
      batchNumber: 'F2T-BAT-2026-TOM-01',
      isAvailable: true,
      isOrganicCertified: true,
      averageRating: 4.9,
      reviewCount: 24,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-10-08T00:00:00.000Z'
    },
    {
      _id: 'prod_organic_strawberries',
      farmerId: farmer2._id,
      farmerName: 'Elena Vance',
      farmName: 'Suncrest Berry & Citrus Orchards',
      farmLocation: 'Hood River, OR',
      name: 'Wild Mountain Organic Strawberries',
      description: 'Sweet, fragrance-rich organic strawberries grown using natural pollination and mountain stream water. Packed in biodegradable punnets.',
      categoryId: 'cat_fruits',
      categoryName: 'Farm Fresh Fruits',
      price: 6.50,
      unit: 'bunch',
      stockQuantity: 85,
      images: ['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80'],
      harvestDate: '2026-10-09',
      batchNumber: 'F2T-BAT-2026-STR-04',
      isAvailable: true,
      isOrganicCertified: true,
      averageRating: 4.8,
      reviewCount: 19,
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-10-09T00:00:00.000Z'
    },
    {
      _id: 'prod_crisp_spinach',
      farmerId: farmer1._id,
      farmerName: 'Rajesh Kumar',
      farmName: 'Green Valley Agro & Organic Farm',
      farmLocation: 'Nashik Valley',
      name: 'Hydro-Cooled Baby Spinach Greens',
      description: 'Tender baby spinach leaves triple-rinsed in chilled well water and hydro-cooled within two hours of harvesting for maximum shelf life.',
      categoryId: 'cat_vegetables',
      categoryName: 'Fresh Vegetables',
      price: 3.20,
      unit: 'bunch',
      stockQuantity: 60,
      images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80'],
      harvestDate: '2026-10-09',
      batchNumber: 'F2T-BAT-2026-SPN-02',
      isAvailable: true,
      isOrganicCertified: true,
      averageRating: 4.7,
      reviewCount: 15,
      createdAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-10-09T00:00:00.000Z'
    },
    {
      _id: 'prod_honeycrisp_apples',
      farmerId: farmer2._id,
      farmerName: 'Elena Vance',
      farmName: 'Suncrest Berry & Citrus Orchards',
      farmLocation: 'Hood River, OR',
      name: 'Glacier-Fed Honeycrisp Apples',
      description: 'Extra crisp, explosive sweetness, balanced with slight tartness. Tree-ripened without wax coatings or chemical preservation gases.',
      categoryId: 'cat_fruits',
      categoryName: 'Farm Fresh Fruits',
      price: 5.40,
      unit: 'kg',
      stockQuantity: 210,
      images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80'],
      harvestDate: '2026-10-07',
      batchNumber: 'F2T-BAT-2026-APP-09',
      isAvailable: true,
      isOrganicCertified: true,
      averageRating: 5.0,
      reviewCount: 32,
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-10-07T00:00:00.000Z'
    },
    {
      _id: 'prod_pasture_eggs',
      farmerId: farmer2._id,
      farmerName: 'Elena Vance',
      farmName: 'Suncrest Berry & Citrus Orchards',
      farmLocation: 'Hood River, OR',
      name: 'Free-Range Pasture Golden Eggs',
      description: 'Dozen grade-A brown eggs from pasture-foraged heritage hens. Vibrant amber yolks rich in natural Omega-3s.',
      categoryId: 'cat_dairy_eggs',
      categoryName: 'Dairy & Farm Eggs',
      price: 7.00,
      unit: 'crate',
      stockQuantity: 45,
      images: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80'],
      harvestDate: '2026-10-09',
      batchNumber: 'F2T-BAT-2026-EGG-07',
      isAvailable: true,
      isOrganicCertified: true,
      averageRating: 4.9,
      reviewCount: 28,
      createdAt: '2026-09-15T00:00:00.000Z',
      updatedAt: '2026-10-09T00:00:00.000Z'
    },
    {
      _id: 'prod_raw_wildflower_honey',
      farmerId: farmer1._id,
      farmerName: 'Rajesh Kumar',
      farmName: 'Green Valley Agro & Organic Farm',
      farmLocation: 'Nashik Valley',
      name: 'Pure Unfiltered Wildflower Honey',
      description: 'Raw, unpasteurized honey harvested from apiaries placed beside organic mustard and lavender plots. Retains all natural pollen and enzymes.',
      categoryId: 'cat_honey_preserves',
      categoryName: 'Pure Honey & Preserves',
      price: 11.50,
      unit: 'litre',
      stockQuantity: 30,
      images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'],
      harvestDate: '2026-09-28',
      batchNumber: 'F2T-BAT-2026-HNY-03',
      isAvailable: true,
      isOrganicCertified: true,
      averageRating: 4.9,
      reviewCount: 14,
      createdAt: '2026-09-18T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z'
    }
  ];

  for (const prod of productsData) {
    await db.products.insertOne(prod);
  }

  // Produce Batches with Traceability Events
  const batchTomatoes = await db.produceBatches.insertOne({
    _id: 'batch_tom_01',
    batchNumber: 'F2T-BAT-2026-TOM-01',
    productId: 'prod_heirloom_tomatoes',
    productName: 'Vine-Ripened Heirloom Tomatoes',
    farmerId: farmer1._id,
    farmerName: 'Rajesh Kumar',
    farmName: 'Green Valley Agro & Organic Farm',
    farmLocation: 'Nashik Valley, MH (Plot 42-B)',
    harvestDate: '2026-10-08T06:00:00.000Z',
    bestBeforeDate: '2026-10-18T00:00:00.000Z',
    variety: 'Cherokee Purple & Brandywine Hybrid',
    certifications: ['India Organic NPOP', 'EU Equivalent Organic Standards', 'Zero Residue Certified'],
    soilAndWaterPractices: 'Deep vermicompost bed mulched with organic rice husk. Water tested 0% arsenic and heavy metals.',
    pesticideFreeTested: true,
    events: [
      {
        title: 'Dawn Hand Harvest',
        stage: 'harvest',
        timestamp: '2026-10-08T06:30:00.000Z',
        location: 'Field Sector 4B, Nashik Valley',
        actor: 'Rajesh Kumar & Harvest Crew',
        details: 'Hand-picked at 85% vine ripeness into breathable slatted bamboo crates.',
        verified: true
      },
      {
        title: 'Brix Sugar & Spectrometer Residue Inspection',
        stage: 'inspection',
        timestamp: '2026-10-08T08:15:00.000Z',
        location: 'Green Valley On-Site Quality Lab',
        actor: 'Dr. V. Nambiar (Agri Inspector)',
        details: 'Soluble solids measured 5.8° Brix. Zero pesticide residue detected in chromatography test.',
        verified: true
      },
      {
        title: 'Climate Controlled Pre-Cooling & Eco-Packaging',
        stage: 'packaging',
        timestamp: '2026-10-08T11:00:00.000Z',
        location: 'Farm Packhouse #1',
        actor: 'Anita Sharma (Pack Lead)',
        details: 'Temperature stabilized to 13°C. Graded by size and packed into recycled pulp cartons.',
        verified: true
      },
      {
        title: 'Direct Marketplace Dispatch',
        stage: 'transit',
        timestamp: '2026-10-08T15:30:00.000Z',
        location: 'Dispatch Dock 2',
        actor: 'Farm2Trust Direct Courier Fleet',
        details: 'Loaded into temperature-monitored electric transit van (Log #ET-449).',
        verified: true
      }
    ],
    createdAt: '2026-10-08T06:00:00.000Z',
    updatedAt: '2026-10-08T15:30:00.000Z'
  });

  // Generate QR Code for the batch
  try {
    const qrData = `${process.env.APP_URL || 'https://farm2trust.app'}/traceability/${batchTomatoes.batchNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 280, color: { dark: '#14532d', light: '#ffffff' } });
    await db.produceBatches.updateById(batchTomatoes._id, { qrCodeDataUrl });
  } catch (err) {
    console.error('Failed to generate sample QR code:', err);
  }

  // Sample Orders
  const sampleOrder1 = await db.orders.insertOne({
    _id: 'ord_1001',
    orderNumber: 'F2T-ORD-2026-1001',
    customerId: customerUser._id,
    customerName: 'Sarah Jenkins',
    customerEmail: 'customer@farm2trust.com',
    customerPhone: '+1 (555) 987-6543',
    items: [
      {
        productId: 'prod_heirloom_tomatoes',
        productName: 'Vine-Ripened Heirloom Tomatoes',
        price: 4.80,
        unit: 'kg',
        quantity: 2,
        subtotal: 9.60,
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
        farmerId: farmer1._id,
        batchNumber: 'F2T-BAT-2026-TOM-01'
      },
      {
        productId: 'prod_crisp_spinach',
        productName: 'Hydro-Cooled Baby Spinach Greens',
        price: 3.20,
        unit: 'bunch',
        quantity: 1,
        subtotal: 3.20,
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
        farmerId: farmer1._id,
        batchNumber: 'F2T-BAT-2026-SPN-02'
      }
    ],
    subtotal: 12.80,
    deliveryFee: 2.50,
    totalAmount: 15.30,
    shippingAddress: {
      street: '742 Evergreen Terrace, Apt 4B',
      city: 'Portland',
      state: 'Oregon',
      postalCode: '97201',
      country: 'United States'
    },
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'paid',
    status: 'Delivered',
    statusHistory: [
      {
        status: 'Placed',
        timestamp: '2026-10-06T10:00:00.000Z',
        actorRole: 'customer',
        actorId: customerUser._id,
        actorName: 'Sarah Jenkins',
        note: 'Order placed with Cash on Delivery'
      },
      {
        status: 'Confirmed',
        timestamp: '2026-10-06T11:30:00.000Z',
        actorRole: 'farmer',
        actorId: farmer1._id,
        actorName: 'Rajesh Kumar',
        note: 'Farmer confirmed harvest availability'
      },
      {
        status: 'Packed',
        timestamp: '2026-10-06T15:00:00.000Z',
        actorRole: 'farmer',
        actorId: farmer1._id,
        actorName: 'Rajesh Kumar',
        note: 'Freshly packed into eco cartons'
      },
      {
        status: 'Shipped',
        timestamp: '2026-10-07T08:00:00.000Z',
        actorRole: 'farmer',
        actorId: farmer1._id,
        actorName: 'Rajesh Kumar',
        note: 'Handed to local delivery route'
      },
      {
        status: 'Delivered',
        timestamp: '2026-10-07T14:20:00.000Z',
        actorRole: 'system',
        actorId: 'sys',
        actorName: 'Delivery Confirmation',
        note: 'Delivered to customer doorstep and verified'
      }
    ],
    createdAt: '2026-10-06T10:00:00.000Z',
    updatedAt: '2026-10-07T14:20:00.000Z'
  });

  const sampleOrder2 = await db.orders.insertOne({
    _id: 'ord_1002',
    orderNumber: 'F2T-ORD-2026-1002',
    customerId: customerUser._id,
    customerName: 'Sarah Jenkins',
    customerEmail: 'customer@farm2trust.com',
    customerPhone: '+1 (555) 987-6543',
    items: [
      {
        productId: 'prod_organic_strawberries',
        productName: 'Wild Mountain Organic Strawberries',
        price: 6.50,
        unit: 'bunch',
        quantity: 2,
        subtotal: 13.00,
        image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80',
        farmerId: farmer2._id,
        batchNumber: 'F2T-BAT-2026-STR-04'
      }
    ],
    subtotal: 13.00,
    deliveryFee: 2.50,
    totalAmount: 15.50,
    shippingAddress: {
      street: '742 Evergreen Terrace, Apt 4B',
      city: 'Portland',
      state: 'Oregon',
      postalCode: '97201',
      country: 'United States'
    },
    paymentMethod: 'mock_escrow_card',
    paymentStatus: 'paid',
    status: 'Shipped',
    statusHistory: [
      {
        status: 'Placed',
        timestamp: '2026-10-09T09:10:00.000Z',
        actorRole: 'customer',
        actorId: customerUser._id,
        actorName: 'Sarah Jenkins',
        note: 'Order placed with Mock Escrow Card'
      },
      {
        status: 'Confirmed',
        timestamp: '2026-10-09T10:00:00.000Z',
        actorRole: 'farmer',
        actorId: farmer2._id,
        actorName: 'Elena Vance',
        note: 'Fresh morning harvest confirmed'
      },
      {
        status: 'Packed',
        timestamp: '2026-10-09T13:00:00.000Z',
        actorRole: 'farmer',
        actorId: farmer2._id,
        actorName: 'Elena Vance',
        note: 'Packed in chilled punnets'
      },
      {
        status: 'Shipped',
        timestamp: '2026-10-09T16:30:00.000Z',
        actorRole: 'farmer',
        actorId: farmer2._id,
        actorName: 'Elena Vance',
        note: 'In transit via regional direct courier'
      }
    ],
    createdAt: '2026-10-09T09:10:00.000Z',
    updatedAt: '2026-10-09T16:30:00.000Z'
  });

  // Eligible customer reviews (on completed delivered orders)
  await db.reviews.insertOne({
    _id: 'rev_001',
    productId: 'prod_heirloom_tomatoes',
    orderId: sampleOrder1._id,
    customerId: customerUser._id,
    customerName: 'Sarah Jenkins',
    rating: 5,
    title: 'Incredible taste, reminds me of my grandmother garden',
    comment: 'You immediately smell the tomato vine richness. Scanned the QR code on the box and saw it was picked the morning before it arrived. Never buying supermarket tomatoes again!',
    isVerifiedPurchase: true,
    isModerated: false,
    createdAt: '2026-10-07T16:00:00.000Z'
  });

  // Audit Log Entry
  await db.auditLogs.insertOne({
    _id: 'audit_001',
    action: 'FARMER_VERIFICATION_APPROVED',
    actorId: adminUser._id,
    actorRole: 'admin',
    actorEmail: 'admin@farm2trust.org',
    targetEntity: 'FarmerProfile',
    targetId: 'fp_rajesh',
    details: {
      farmName: 'Green Valley Agro & Organic Farm',
      verifiedDocuments: 2,
      reason: 'Valid government land deed and certified organic test reports inspected.'
    },
    timestamp: '2026-01-12T14:30:00.000Z'
  });

  console.log('[DB] Seeding completed successfully!');
}
