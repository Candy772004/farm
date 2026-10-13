export type UserRole = 'customer' | 'farmer' | 'admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'not_submitted';
export type OrderStatus = 'Placed' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  addresses: IAddress[];
  farmerProfile?: IFarmerProfile | null;
}

export interface IAddress {
  _id: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface IFarmerProfile {
  _id: string;
  userId: string;
  farmName: string;
  bio: string;
  location: {
    address?: string;
    city: string;
    state: string;
    country: string;
  };
  totalAcreage: number;
  farmingPractices: string[];
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  documents: {
    title: string;
    type: string;
    url: string;
    verified: boolean;
  }[];
  bankAccountDetails?: {
    accountHolder: string;
    accountNumberMasked: string;
    bankName: string;
  };
  createdAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  isActive: boolean;
}

export interface IProduct {
  _id: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmLocation: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  unit: string;
  stockQuantity: number;
  images: string[];
  harvestDate?: string;
  batchNumber?: string;
  isAvailable: boolean;
  isOrganicCertified: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
}

export interface ITraceabilityEvent {
  title: string;
  stage: 'harvest' | 'inspection' | 'cold_storage' | 'packaging' | 'transit' | 'delivered';
  timestamp: string;
  location: string;
  actor: string;
  details: string;
  verified: boolean;
}

export interface IProduceBatch {
  _id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  farmLocation: string;
  harvestDate: string;
  bestBeforeDate?: string;
  variety?: string;
  certifications: string[];
  soilAndWaterPractices?: string;
  pesticideFreeTested: boolean;
  qrCodeDataUrl?: string;
  events: ITraceabilityEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface IOrderItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
  subtotal: number;
  image: string;
  farmerId: string;
  batchNumber?: string;
}

export interface IOrderHistoryEvent {
  status: OrderStatus;
  timestamp: string;
  actorRole: UserRole | 'system';
  actorId: string;
  actorName: string;
  note?: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  shippingAddress: IAddress;
  paymentMethod: 'cash_on_delivery' | 'mock_escrow_card';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: OrderStatus;
  statusHistory: IOrderHistoryEvent[];
  cancellationReason?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReview {
  _id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isModerated: boolean;
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  action: string;
  actorId: string;
  actorRole: string;
  actorEmail: string;
  targetEntity: string;
  targetId: string;
  details: Record<string, any>;
  timestamp: string;
}
