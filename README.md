# Canteeno 🍔☕

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Campus%20Food%20Ordering-orange?style=for-the-badge&logo=fastapi" alt="Platform" />
  <img src="https://img.shields.io/badge/Node.js-v20+-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-ReplicaSet-brightgreen?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Prisma-ORM-darkblue?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-black?style=for-the-badge&logo=socket.io" alt="Socket.IO" />
</p>

> **Canteeno** is a college food ordering and counter pickup management platform engineered to eliminate canteen queues across campus. Built with a production-grade decoupled architecture featuring real-time WebSocket order tracking, dynamic queue-aware prep time estimations, server-side tamper-proof price verification, and multi-tenant canteen role-based access control.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Key Features](#-key-features)
  - [Student Portal](#-student-experience)
  - [Kitchen Staff Operations](#-canteen-staff-portal)
  - [Campus Platform Admin](#-platform-administration)
- [Smart ETA Engine](#-smart-eta-engine)
- [Tech Stack & Engineering Design](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started & Local Setup](#-getting-started)
- [Demo Credentials](#-pre-seeded-demo-accounts)
- [REST API Specification](#-rest-api-specification)
- [Real-Time Socket Events](#-real-time-socket-events)
- [Security & Production Hardening](#-security--production-hardening)
- [Contributing & License](#-contributing)

---

## 🏗️ Architectural Overview

```
                      ┌──────────────────────────────────────────┐
                      │             React 19 Frontend            │
                      │   (TanStack Start + Router + Tailwind)   │
                      └─────────────────┬────────────────────────┘
                                        │
                         HTTP REST      │  WebSocket (ws://)
                     (Bearer JWT Auth)  │  (Bi-directional)
                                        │
                      ┌─────────────────▼────────────────────────┐
                      │           Express.js Gateway             │
                      │   Helmet · Rate Limiting · Zod Guard    │
                      └─────────────────┬────────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
  ┌──────────▼──────────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
  │  Order State Engine │    │   Smart ETA Queue   │    │  Socket Room Broker │
  │  (MongoDB Session)  │    │ (Weighted Avg + QA) │    │  (Tenant Isolation) │
  └──────────┬──────────┘    └──────────┬──────────┘    └──────────┬──────────┘
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                      ┌─────────────────▼────────────────────────┐
                      │           Prisma ORM Client              │
                      │    (Transactions & Strict Validation)    │
                      └─────────────────┬────────────────────────┘
                                        │
                      ┌─────────────────▼────────────────────────┐
                      │    MongoDB Replica Set Database (rs0)    │
                      │    14 Canteens · 465 Foods · Orders      │
                      └──────────────────────────────────────────┘
```

---

## 🌟 Key Features

### 🎓 Student Experience
- **14 Campus Outlets**: Nescafe, Annapurna Canteen, Hostel A–K Canteens, Amba, LHC Canteen, and Surya with live operational statuses and verified menus.
- **Smart Queue-Aware ETA**: View intelligent wait-time predictions calculated dynamically from historical completed orders and live kitchen queues before placing orders.
- **Strict Cart Isolation**: Single-canteen cart constraints prevent cross-outlet fulfillment conflicts.
- **Counter Pickup Scheduling**: Select **ASAP** or reserve upcoming 15-minute pickup intervals throughout the day.
- **Real-Time Order Lifecycle**: Live status progression updates instantaneously via Socket.IO:
  $$\text{PLACED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{PREPARING} \longrightarrow \text{READY FOR PICKUP} \longrightarrow \text{COLLECTED}$$
- **Favorites & Instant Reorder**: Save preferred snacks and reorder completed meals in a single tap.
- **Meal Reviews**: Submit star ratings and written reviews directly linked to verified orders.

### 👨‍🍳 Canteen Staff Portal
- **Incoming Order Bell**: Real-time acoustic alerts and instant visual updates when new student orders arrive.
- **Kitchen Flow Controls**: 1-click status transitions (Accept, Reject with reason, Mark Preparing, Mark Ready, Mark Collected).
- **Stock & Menu Control**: Toggle instant item stock status (`inStock: true/false`), hide seasonal items, and edit pricing on the fly.
- **Workload Buffer Override**: Manually adjust prep time estimates if kitchen equipment or peak rushes experience unexpected bottlenecks.
- **Shift Analytics**: Review real-time sales revenue, average kitchen prep times, and order volume for the current day.

### 🛡️ Platform Administration
- **Campus Metrics**: High-level platform telemetry tracking daily volume, active users, total platform turnover, and individual outlet throughput.
- **Outlet Lifecycle CRUD**: Provision new dining spots, update opening hours, edit contact details, and manage canteen assignments.
- **Menu Category Manager**: Reorder, add, or deprecate campus-wide food categories.
- **User Governance**: Inspect registered students and toggle account suspension flags to prevent abuse.
- **Review Moderation**: Approve or remove flagged reviews and monitor student feedback trends.
- **Global Platform Controls**: Toggle campus-wide emergency ordering pauses, configure maximum active orders per student (default 3), and set pickup hold grace windows.

---

## ⏱️ Smart ETA Engine

Canteeno does not rely on static dummy wait times. It incorporates a dual-tier dynamic queue algorithm:

$$\text{ETA} = \max\left(5, \; \min\left(90, \; \bar{T}_{\text{historical}} + (Q_{\text{active}} \times W_{\text{penalty}})\right)\right)$$

Where:
- $\bar{T}_{\text{historical}}$ is the recency-weighted average duration (minutes) elapsed between `placed` and `ready` events across completed orders in the last 14 days at that specific outlet.
- $Q_{\text{active}}$ is the count of orders currently in `PENDING`, `ACCEPTED`, or `PREPARING` state at that canteen.
- $W_{\text{penalty}}$ is the dynamically calibrated per-order kitchen queue penalty ($2.5\text{ min/order}$).
- Confidence score (`high`, `medium`, `low`, `none`) is explicitly surfaced to students alongside sample size transparently.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend Runtime** | Node.js v20+ & TypeScript | High-performance asynchronous non-blocking event loop |
| **API Framework** | Express.js | Structured routing, middleware pipelines, error interception |
| **ORM & Database** | Prisma ORM & MongoDB (rs0) | Type-safe schema validation, document indexing, replica transactions |
| **Real-Time Layer** | Socket.IO | Low-latency bi-directional state broadcast with authenticated rooms |
| **Authentication** | JWT & bcrypt | Stateless token-based access with secure credential salting |
| **Validation** | Zod | Runtime input parsing and schema verification for requests |
| **Frontend Framework** | React 19 & TanStack Start | Modern SSR/CSR hybrid routing and client state hydration |
| **Styling & Icons** | Tailwind CSS v4 & Lucide Icons | Responsive mobile-first design system |
| **Client Store** | Zustand | Persistent client cache with real-time socket subscription hooks |

---

## 📂 Project Directory Structure

```
canteeno/
├── README.md                      # Comprehensive platform guide
├── RESEARCH.md                    # In-depth architectural & system design research
├── package.json                   # Root workspace scripts
├── .env.example                   # Master environment configuration template
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Prisma MongoDB models (User, Canteen, FoodItem, Order, etc.)
│   │   └── seed.ts                # Production seed script (14 canteens, 465 food items)
│   ├── src/
│   │   ├── config/                # Database singleton, environment parsing (Zod)
│   │   ├── controllers/           # REST business logic controllers
│   │   ├── middleware/            # JWT auth, RBAC permissions, rate limiting, error handler
│   │   ├── routes/                # Express router modular definitions
│   │   ├── services/              # Order state engine, Socket.IO broker, notifications
│   │   ├── utils/                 # Historical ETA math, food formatters, response helpers
│   │   ├── validators/            # Request body Zod schemas
│   │   ├── app.ts                 # Express middleware configuration
│   │   └── server.ts              # HTTP & Socket.IO initialization
│   ├── tsconfig.json
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/            # UI components (Radix primitives, food cards, dialogs)
    │   ├── lib/                   # API client, WebSocket singleton, order domain logic
    │   ├── routes/                # TanStack Router file-based pages (Student, Staff, Admin)
    │   ├── store/                 # Zustand state machine synced with backend API
    │   └── assets/                # Optimized campus outlet imagery
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 20.x
- **npm** >= 10.x
- **MongoDB** >= 6.x / 8.x configured with replica set (required for Prisma transactions)

### 1. Database Setup (Replica Set)
Prisma requires a replica set on MongoDB. You can start a local instance via mongod:
```bash
mongod --port 27018 --dbpath "./mongo-data" --replSet rs0 --bind_ip 127.0.0.1
```
*(On first startup, run `mongosh --port 27018 --eval "rs.initiate()"` in your terminal to initialize `rs0`)*.

### 2. Backend Installation & Seeding

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma client and push schema to MongoDB
npm run prisma:generate
npm run prisma:db:push

# Seed demo outlets, food catalog and role accounts
npm run db:seed

# Compile and start backend development server
npm run dev
```
Backend will be listening on `http://localhost:5000`.

### 3. Frontend Installation & Launch

```bash
cd ../frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Start Vite client development server
npm run dev
```
Frontend will be listening on `http://localhost:3000`.

---

## 🔑 Pre-Seeded Demo Accounts

| Role | Email | Password | Assigned Scope |
|---|---|---|---|
| **Student** | `aarav@campus.edu` | `demo1234` | Student food ordering, cart, ETA & pickup |
| **Student** | `diya@campus.edu` | `demo1234` | Student food ordering & meal reviews |
| **Staff (Nescafe)** | `staff.nescafe@campus.edu` | `staff1234` | Nescafe Kitchen Order Queue & Stock |
| **Staff (Annapurna)** | `staff.annapurna@campus.edu` | `staff1234` | Annapurna Dining Kitchen & Menu |
| **Staff (Amba)** | `staff.amba@campus.edu` | `staff1234` | Amba Kitchen Order Queue & Stock |
| **Platform Admin** | `admin@campus.edu` | `admin1234` | Full Campus Governance & Outlets |

*Tip: Quick 1-click demo logins are available on the login page for effortless evaluation.*

---

## 📡 REST API Specification

### Student APIs
- `POST /api/auth/register` — Register student account
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/me` — Retrieve signed-in student profile
- `PATCH /api/auth/profile` — Update hostel/phone profile details
- `POST /api/auth/favourites/food/:id` — Toggle food item favorite
- `POST /api/auth/favourites/canteen/:id` — Toggle canteen favorite
- `GET /api/canteens` — List all campus canteens (`?openOnly=true`)
- `GET /api/canteens/:id` — Get canteen profile by ObjectId or short code
- `GET /api/canteens/:id/menu` — Retrieve active food menu for canteen
- `GET /api/canteens/:id/eta` — Calculate live queue-aware estimated wait time
- `GET /api/food` — Filter food catalog by search query, veg status, category
- `GET /api/food/:id` — Single food item details
- `GET /api/categories` — Campus category listings
- `POST /api/orders` — Submit pickup order (server validates item prices & stock)
- `GET /api/orders/my-orders` — Student personal order history
- `GET /api/orders/:id` — Order status and milestone timestamps
- `POST /api/orders/:id/cancel` — Cancel pending order before kitchen acceptance
- `POST /api/reviews` — Post star rating and feedback
- `GET /api/notifications` — Retrieve student in-app notifications
- `PATCH /api/notifications/:id/read` — Mark notification read

### Staff APIs
- `GET /api/staff/dashboard` — Live kitchen stats, active count, revenue summary
- `GET /api/staff/orders` — Orders ledger for the staff member's outlet
- `PATCH /api/staff/orders/:id/accept` — Accept pending order
- `PATCH /api/staff/orders/:id/reject` — Reject incoming order with explanation
- `PATCH /api/staff/orders/:id/preparing` — Move order to kitchen cooking stage
- `PATCH /api/staff/orders/:id/ready` — Mark order ready at counter for pickup
- `PATCH /api/staff/orders/:id/collected` — Finalize order upon counter collection
- `PATCH /api/staff/orders/:id/prep-time` — Manually override estimated prep minutes
- `POST /api/staff/food` — Create new menu food item
- `PUT /api/staff/food/:id` — Update existing food item details & price
- `DELETE /api/staff/food/:id` — Remove food item from menu
- `PATCH /api/staff/food/:id/availability` — Toggle `inStock` / `isAvailable` status
- `PATCH /api/staff/canteen/status` — Toggle outlet open status and order reception
- `GET /api/staff/analytics` — Outlet daily performance analysis

### Admin APIs
- `GET /api/admin/dashboard` — Campus-wide order and revenue telemetry
- `GET /api/admin/users` — List registered campus users
- `PATCH /api/admin/users/:id/status` — Suspend or reactivate student account
- `GET /api/admin/canteens` — List all outlets
- `POST /api/admin/canteens` — Create new campus dining outlet
- `PUT /api/admin/canteens/:id` — Update outlet operational specs
- `DELETE /api/admin/canteens/:id` — Remove dining outlet
- `GET /api/admin/orders` — Master campus order history
- `GET /api/admin/reviews` — Review moderation stream
- `PATCH /api/admin/reviews/:id` — Moderate review status (`published`/`flagged`/`hidden`)
- `GET /api/admin/settings` — Read platform runtime settings
- `PATCH /api/admin/settings` — Update platform runtime limits and emergency pause

---

## ⚡ Real-Time Socket Events

Socket.IO connections are authenticated with JWT tokens upon handshake and isolated into tenant rooms:
- `user:<userId>`: Individual room for student status alerts.
- `canteen:<canteenId>`: Private kitchen room for authorized outlet staff.
- `order:<orderId>`: Dedicated live order tracker channel.

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `order:new` | Server $\rightarrow$ Staff | `FormattedOrder` | Emitted immediately when a student places a new order |
| `order:status_updated` | Server $\rightarrow$ Both | `FormattedOrder` | Emitted when order transitions between stages |
| `notification:new` | Server $\rightarrow$ Student | `Notification` | Emitted for counter alerts and kitchen updates |

---

## 🛡️ Security & Production Hardening

1. **Server-Authoritative Pricing**: The client cart submits only food item IDs and quantities. The backend fetches active items directly from MongoDB, verifies availability and stock, and computes subtotals and totals on the server.
2. **Cross-Tenant Guarding**: Staff authorization middleware verifies that incoming operations match the caller's assigned canteen ID, blocking unauthorized access to competing outlets.
3. **State Transition Finite State Machine**: Order status changes strictly adhere to allowable paths; orders cannot transition out of terminal states (`COLLECTED`, `REJECTED`, `CANCELLED`).
4. **Defensive MongoDB Lookup Guards**: Safe ObjectId validation prevents MongoDB BSON malformed hex string crashes when querying human-readable slugs.
5. **Rate Limiting & Headers**: Configured with Helmet HTTP security headers, CORS origin whitelisting, and IP-based rate limiting on sensitive authentication routes.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome! Please open an issue or pull request on GitHub.

```bash
# Branch convention
git checkout -b feature/your-feature-name

# Commit convention
git commit -m "feat: description of changes"
```

---

<p align="center">
  <b>Canteeno</b> — Engineered for seamless campus dining.
</p>
