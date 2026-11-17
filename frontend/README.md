# Canteeno Frontend

The modern web frontend for **Canteeno** — a college food ordering and counter pickup platform.

## Features
- **Student Experience**: Browse campus canteens, view live menus, manage shopping cart, schedule pickups, track order status in real time, and submit reviews.
- **Staff Portal**: View incoming counter orders, update preparation stages (Accepted, Preparing, Ready for Pickup, Collected), adjust item availability, toggle canteen open status, and monitor live analytics.
- **Admin Dashboard**: Manage campus canteens, food categories, registered students, platform settings, and system-wide orders.
- **Real-Time Websockets**: Instant order notifications and status updates via Socket.IO.

## Tech Stack
- React 19
- TanStack Start & TanStack Router
- Tailwind CSS v4
- Zustand for client state management
- Lucide Icons & Radix UI
- Socket.IO Client

## Setup & Running
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
By default, the frontend runs on port 3000 and connects to the backend API at `http://localhost:5000`.
