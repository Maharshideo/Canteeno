# Canteeno 🍔☕

> College food ordering and counter pickup management platform designed to eliminate canteen lines across campus.

Canteeno is a production-grade full-stack platform built with modern technologies. It connects campus dining outlets with students and kitchen staff through real-time order workflows, live preparation tracking, and automated counter pickup notifications.

---

## 🌟 Key Features

### 🎓 Student Experience
- **Campus Canteen Directory**: Explore 14 campus outlets (Nescafe, Annapurna, Hostel canteens A–K, Amba, LHC Canteen, Surya) with live open/closed status, prep time indicators, and dietary filters.
- **Dynamic Menus & Ordering**: Browse snacks, full thalis, Maggi combos, beverages, and desserts. Cart validation restricts orders to one canteen at a time.
- **Counter Pickup Scheduling**: Choose "ASAP" or pick an upcoming pickup time slot. Free counter pickup (no delivery module).
- **Live Real-Time Order Tracking**: Order stages update dynamically in the UI through WebSockets (Socket.IO):
  `Placed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready for Pickup` ➔ `Collected`.
- **Order History & Quick Reorder**: View past orders and 1-tap reorder.
- **Ratings & Reviews**: Share meal ratings and reviews for campus outlets.
- **Notifications**: Instant alerts when orders are accepted, kitchen begins cooking, or counter is ready.

### 👨‍🍳 Canteen Staff Portal
- **Live Kitchen Queue**: Real-time incoming order bell and queue view.
- **Kitchen Actions**: 1-click order state transitions (Accept, Reject with reason, Mark Preparing, Mark Ready, Mark Collected).
- **Dynamic Prep Time Adjustment**: Update preparation estimates based on kitchen workload.
- **Menu Management**: Add new items, edit pricing, toggle availability ("In Stock" / "Out of Stock" / "Hidden").
- **Outlet Operations**: Toggle outlet open status and order acceptance.
- **Analytics**: Real-time summary of today's collected orders, revenue, and top-selling food items.

### 🛡️ Platform Administration
- **Campus Overview**: System-wide statistics for users, active orders, total revenue, and outlet performance.
- **Outlet CRUD**: Add, update, or remove canteens and adjust opening hours.
- **Category Control**: Organize campus food categories.
- **Student User Management**: Monitor registered students and toggle account status (`active` / `suspended`).
- **Review Moderation**: Moderate student reviews and post staff replies.
- **Platform Settings**: Campus-wide ordering toggles, max active orders limit, and counter hold window configuration.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens), bcrypt password hashing, role-based authorization middleware
- **Real-Time Communication**: Socket.IO with authenticated channels and room-based isolation
- **Request Validation**: Zod schemas for all request bodies, params, and queries
- **Security**: Helmet HTTP headers, CORS origin verification, express-rate-limit protection
- **Frontend**: React 19, TanStack Start, TanStack Router, Tailwind CSS v4, Lucide Icons, Radix UI, Zustand

---

## 🏗️ Architecture & Project Structure

```
canteeno/
├── package.json              # Monorepo root scripts
├── .gitignore
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # MongoDB schema definition
│   │   └── seed.ts           # Demo seed data for all 14 canteens & accounts
│   ├── src/
│   │   ├── config/           # Database singleton, Zod environment validation
│   │   ├── controllers/      # Auth, Canteen, Food, Order, Staff, Admin controllers
│   │   ├── middleware/       # Auth JWT, Role RBAC, Rate limiters, Error handler
│   │   ├── routes/           # Express REST endpoints
│   │   ├── services/         # Order state engine, Socket.IO server, Notifications
│   │   ├── utils/            # Order number generator, prep calculator, response helpers
│   │   ├── validators/       # Zod input schemas
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # HTTP & Socket.IO server entrypoint
│   ├── tsconfig.json
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/       # Radix UI, Canteeno cards, dialogs, drawers, layout
    │   ├── lib/              # API client, Socket.IO client, order logic, types
    │   ├── routes/           # TanStack file-based routes for Student, Staff, Admin
    │   ├── store/            # Zustand app-store integrated with real backend & sockets
    │   └── assets/           # Campus food & canteen visual assets
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.x
- MongoDB (Running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas replica set)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Generate Prisma client and sync database schema
npm run prisma:generate
npm run prisma:db:push

# Seed initial campus canteens, menus, categories & test accounts
npm run db:seed

# Start backend server in development mode
npm run dev
```

The backend server runs at `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend application runs at `http://localhost:3000`.

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Email | Password | Access |
|---|---|---|---|
| **Student** | `aarav@campus.edu` | `demo1234` | Full Student food ordering & pickup |
| **Student** | `diya@campus.edu` | `demo1234` | Student food ordering & pickup |
| **Staff** | `staff.nescafe@campus.edu` | `staff1234` | Nescafe Kitchen Dashboard |
| **Staff** | `staff.annapurna@campus.edu` | `staff1234` | Annapurna Kitchen Dashboard |
| **Staff** | `staff.amba@campus.edu` | `staff1234` | Amba Kitchen Dashboard |
| **Admin** | `admin@campus.edu` | `admin1234` | Campus Admin & Outlet Management |

*Note: You can also use the 1-click demo login buttons directly on the login screen.*

---

## 📡 REST API Reference

### Student Endpoints
- `POST /api/auth/register` — Register new campus student
- `POST /api/auth/login` — Sign in and obtain JWT access token
- `GET /api/auth/me` — Current user profile
- `PATCH /api/auth/profile` — Update student profile
- `POST /api/auth/favourites/food/:id` — Toggle food item favourite
- `POST /api/auth/favourites/canteen/:id` — Toggle canteen favourite
- `GET /api/canteens` — List all campus canteens
- `GET /api/canteens/:id` — Outlet details
- `GET /api/canteens/:id/menu` — Outlet live food menu
- `GET /api/food` — Food catalog with filters (vegOnly, search, category)
- `GET /api/food/:id` — Food item details
- `GET /api/categories` — Food categories
- `POST /api/orders` — Place counter pickup order (validates server-side)
- `GET /api/orders/my-orders` — Student order history
- `GET /api/orders/:id` — Live status of specific order
- `POST /api/orders/:id/cancel` — Cancel pending order
- `POST /api/reviews` — Submit outlet review
- `GET /api/notifications` — Student notification list
- `PATCH /api/notifications/:id/read` — Mark notification read

### Staff Endpoints
- `GET /api/staff/dashboard` — Live kitchen stats & incoming orders
- `GET /api/staff/orders` — All orders for the staff member's canteen
- `PATCH /api/staff/orders/:id/accept` — Accept order
- `PATCH /api/staff/orders/:id/reject` — Reject order with reason
- `PATCH /api/staff/orders/:id/preparing` — Mark in-kitchen preparation
- `PATCH /api/staff/orders/:id/ready` — Mark ready for counter pickup
- `PATCH /api/staff/orders/:id/collected` — Mark collected
- `PATCH /api/staff/orders/:id/prep-time` — Adjust preparation estimate
- `POST /api/staff/food` — Create food item
- `PUT /api/staff/food/:id` — Update food item
- `DELETE /api/staff/food/:id` — Delete food item
- `PATCH /api/staff/food/:id/availability` — Toggle item stock / visibility
- `PATCH /api/staff/canteen/status` — Toggle canteen open / order acceptance
- `GET /api/staff/analytics` — Outlet sales and revenue analytics

### Admin Endpoints
- `GET /api/admin/dashboard` — Campus-wide stats & analytics
- `GET /api/admin/users` — List registered students
- `PATCH /api/admin/users/:id/status` — Suspend or activate user
- `GET /api/admin/canteens` — Manage all outlets
- `POST /api/admin/canteens` — Create new canteen
- `PUT /api/admin/canteens/:id` — Update canteen
- `DELETE /api/admin/canteens/:id` — Remove canteen
- `GET /api/admin/orders` — System-wide order ledger
- `GET /api/admin/reviews` — Moderation review feed
- `PATCH /api/admin/reviews/:id` — Update review status
- `GET /api/admin/categories` — Manage food categories
- `POST /api/admin/categories` — Create category
- `PUT /api/admin/categories/:id` — Update category
- `DELETE /api/admin/categories/:id` — Delete category
- `GET /api/admin/settings` — Platform settings
- `PATCH /api/admin/settings` — Update platform settings
- `GET /api/admin/analytics` — Revenue breakdown across outlets

---

## 🔒 Security Measures
- **Password Protection**: Salted password hashing with bcrypt.
- **Strict Role-Based Access Control**: Route-level middleware ensures students, staff, and administrators can only execute authorized operations.
- **Multi-Tenant Outlet Isolation**: Canteen staff cannot view or alter orders belonging to other canteens.
- **Tamper-Proof Order Valuation**: Total amounts, item availability, and active limits are strictly computed and verified on the server.
- **Rate Limiting**: Brute-force protection on authentication and public API endpoints.
