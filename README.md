# Farm2Trust — Direct Farmer-to-Customer Marketplace

**Farm2Trust** is a full-stack, transparent agricultural marketplace that connects regenerative family farms directly with customers, eliminating broker markups and ensuring verifiable field provenance through QR batch traceability.

---

## 1. System Architecture & Tech Stack

### Frontend
- **Framework**: React 19 + Vite SPA
- **Styling**: Tailwind CSS (adhering to clean typography, single-line controls, zero-pill metadata discipline, and WCAG AA contrast)
- **Icons**: Lucide React
- **Client Routing**: React Router v7
- **HTTP Client**: Axios with credentials (`withCredentials: true`)
- **Visual Integrity**: Zero-broken-image resilient container fallbacks

### Backend
- **Runtime**: Node.js & Express.js REST API (`/api/v1`)
- **Database**: Dual-engine architecture:
  - **MongoDB & Mongoose**: Connects directly to MongoDB Atlas or local MongoDB when `MONGODB_URI` is supplied.
  - **Embedded High-Performance Persistence Engine**: Built-in fallback ensuring immediate, zero-configuration operation in local dev environments and automated testing.
- **Authentication**: JWT tokens signed with `JWT_SECRET`, transmitted via HTTP-only secure cookies and Bearer headers.
- **Security**:
  - Role-based authorization (`customer`, `farmer`, `admin`).
  - Strict farmer verification gatekeeper (`requireApprovedFarmer`).
  - Protection against privilege escalation (prevents self-assignment to admin role).
  - Server-calculated purchase prices and conditional atomic inventory decrement.
  - Snapshotting of product names, units, and purchase prices at order time.
- **QR Traceability Engine**: `qrcode` generation linking batch provenance identifiers to public, sanitized traceability ledgers.

---

## 2. User Roles & Access Control

| Role | Capabilities | Restrictions |
|---|---|---|
| **Customer** | Browse verified farmers & products, add to cart, choose delivery addresses, place orders (COD or Mock Escrow), track 5-stage order lifecycle, scan QR codes, write verified reviews on delivered orders, cancel eligible orders (`Placed` state). | Cannot create product listings; cannot cancel orders once confirmed/shipped; cannot review unpurchased or undelivered produce. |
| **Farmer** | Submit farm verification applications (land titles, organic standards, acreage, soil practices), manage crop listings after admin approval, update stock (negative quantities rejected), view incoming orders, update valid fulfillment statuses (`Placed` → `Confirmed` → `Packed` → `Shipped` → `Delivered`), generate batch QR codes. | Unverified or rejected farmers are blocked from publishing products or accepting customer orders. |
| **Administrator** | Access protected audit dashboard, inspect submitted farmer deeds and certifications, approve or reject applications with mandatory recorded reason, toggle/suspend suspicious crop listings, view platform analytics (GMV, orders, farmer counts), and inspect immutable audit trail. | Cannot be registered via public signup endpoints. |

---

## 3. Demo Personas & Fast Testing

A convenient **Switch Persona** banner is pinned to the top of the interface for testing all user flows:

1. **Customer**: `customer@farm2trust.com` (Pass: `CustomerPass123!`) — Can browse, purchase, and review delivered crops.
2. **Farmer (Approved)**: `rajesh@greenvalleyfarm.com` (Pass: `FarmerPass123!`) — Green Valley Organic Farm (Approved). Can create crops, generate batch QR codes, and advance orders.
3. **Farmer (Pending)**: `marcus@highlanddairy.com` (Pass: `FarmerPass123!`) — Highland Dairy (Pending verification).
4. **Administrator**: `admin@farm2trust.org` (Pass: `AdminPass123!`) — Can review and approve/reject farmer applications, moderate listings, and view analytics.

---

## 4. Running Locally & Testing

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express + Vite)
npm run dev

# App runs at: http://localhost:3000
```

### Running Automated Test Suite
Farm2Trust includes an automated test suite covering authentication, stock decrement, order state transitions, QR traceability, and review eligibility:
```bash
npm run test
```

### Connecting to MongoDB Atlas
1. Create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and whitelist your IP (or `0.0.0.0/0` for cloud hosting).
3. Copy the connection string and set `MONGODB_URI` in `.env`:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/farm2trust?retryWrites=true&w=majority"
JWT_SECRET="your-production-secret-key"
NODE_ENV="production"
PORT=3000
```

---

## 5. Deployment Guide

### Deploying to Render (Backend / Full-Stack)
1. Fork or push this repository to GitHub.
2. Create a **New Web Service** on Render.
3. Configure settings:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables on Render:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: Random 64-character secret.
   - `NODE_ENV`: `production`

---

## 6. Technical Interview Questions & Answers

**Q1: How does Farm2Trust prevent race conditions when two customers buy the last crate of produce simultaneously?**  
*Answer*: We never rely on the client-side stock count. At checkout, the backend checks inventory conditionally. In MongoDB, atomic updates (`$inc: { stockQuantity: -qty }`) ensure that writes are serialized. If the available quantity is insufficient, the checkout immediately aborts with an informative error before creating the order.

**Q2: Why are prices and units snapshotted into the order document?**  
*Answer*: If a farmer alters the price of heirloom tomatoes from $4.80 to $6.00 next week, old order receipts and financial audits must remain unaltered. Storing line items with snapshotted prices, units, and product names preserves historical accounting integrity.

**Q3: How does the QR code maintain public privacy without exposing internal data?**  
*Answer*: The QR code points to `/traceability/:batchNumber`, queryable through a sanitized public REST endpoint. It returns only verified farm origin, dawn harvest timestamp, and lab residue checks. Customer identities, delivery addresses, passwords, and internal admin notes are strictly omitted.
