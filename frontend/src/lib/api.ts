import type {
  AppNotification,
  Canteen,
  Category,
  FoodItem,
  Order,
  OrderStatus,
  PlatformSettings,
  Review,
  Student,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("canteeno_auth_token");
};

export const setAuthToken = (token: string | null): void => {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("canteeno_auth_token", token);
  } else {
    localStorage.removeItem("canteeno_auth_token");
  }
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: json.error || json.message || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      data: json.data !== undefined ? json.data : json,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network request failed. Is the backend running?",
    };
  }
}

// ----------------- Auth API -----------------
export const authApi = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    rollNo: string;
    phone: string;
    hostel?: string;
  }) => request<{ user: Student; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (email: string, password: string) =>
    request<{ user: Student; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<Student>("/auth/me"),

  updateProfile: (patch: Partial<Student>) =>
    request<Student>("/auth/profile", { method: "PATCH", body: JSON.stringify(patch) }),

  toggleFavouriteFood: (foodId: string) =>
    request<{ added: boolean; favouriteFoods: string[] }>(`/auth/favourites/food/${foodId}`, {
      method: "POST",
    }),

  toggleFavouriteCanteen: (canteenId: string) =>
    request<{ added: boolean; favouriteCanteens: string[] }>(`/auth/favourites/canteen/${canteenId}`, {
      method: "POST",
    }),
};

// ----------------- Canteens API -----------------
export const canteensApi = {
  getAll: (openOnly = false) => request<Canteen[]>(`/canteens${openOnly ? "?openOnly=true" : ""}`),
  getById: (id: string) => request<Canteen>(`/canteens/${id}`),
  getMenu: (id: string) => request<FoodItem[]>(`/canteens/${id}/menu`),
};

// ----------------- Food API -----------------
export const foodApi = {
  getAll: (params?: { canteenId?: string; categoryId?: string; search?: string; vegOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.canteenId) q.set("canteenId", params.canteenId);
    if (params?.categoryId) q.set("categoryId", params.categoryId);
    if (params?.search) q.set("search", params.search);
    if (params?.vegOnly) q.set("vegOnly", "true");
    const qs = q.toString();
    return request<FoodItem[]>(`/food${qs ? `?${qs}` : ""}`);
  },
  getById: (id: string) => request<FoodItem>(`/food/${id}`),
};

// ----------------- Categories API -----------------
export const categoriesApi = {
  getAll: () => request<Category[]>("/categories"),
};

// ----------------- Orders API -----------------
export const ordersApi = {
  create: (body: {
    canteenId: string;
    items: { foodId: string; quantity: number }[];
    pickupSlot?: string;
    note?: string;
    paymentMethod?: string;
  }) => request<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),

  getMyOrders: () => request<Order[]>("/orders/my-orders"),
  getById: (id: string) => request<Order>(`/orders/${id}`),
  cancel: (id: string, reason?: string) =>
    request<Order>(`/orders/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
};

// ----------------- Reviews API -----------------
export const reviewsApi = {
  getAll: (canteenId?: string) =>
    request<Review[]>(`/reviews${canteenId ? `?canteenId=${canteenId}` : ""}`),
  create: (body: { canteenId: string; orderId?: string; rating: number; comment: string }) =>
    request<Review>("/reviews", { method: "POST", body: JSON.stringify(body) }),
};

// ----------------- Notifications API -----------------
export const notificationsApi = {
  getAll: () => request<AppNotification[]>("/notifications"),
  markRead: (id: string) => request<{ ok: boolean }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<{ ok: boolean }>("/notifications/read-all", { method: "PATCH" }),
};

// ----------------- Staff API -----------------
export const staffApi = {
  getDashboard: (canteenId?: string) =>
    request<{
      canteen: Canteen;
      stats: {
        ordersToday: number;
        collectedToday: number;
        waitingToAccept: number;
        revenueToday: number;
        avgPrepMinutes: number;
        activeOrdersCount: number;
        outOfStockCount: number;
      };
      incoming: Order[];
      active: Order[];
      outOfStockFoods: FoodItem[];
    }>(`/staff/dashboard${canteenId ? `?canteenId=${canteenId}` : ""}`),

  getOrders: (canteenId?: string) =>
    request<Order[]>(`/staff/orders${canteenId ? `?canteenId=${canteenId}` : ""}`),

  acceptOrder: (id: string) => request<Order>(`/staff/orders/${id}/accept`, { method: "PATCH" }),
  rejectOrder: (id: string, reason?: string) =>
    request<Order>(`/staff/orders/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  markPreparing: (id: string) => request<Order>(`/staff/orders/${id}/preparing`, { method: "PATCH" }),
  markReady: (id: string) => request<Order>(`/staff/orders/${id}/ready`, { method: "PATCH" }),
  markCollected: (id: string) => request<Order>(`/staff/orders/${id}/collected`, { method: "PATCH" }),
  updatePrepTime: (id: string, minutes: number) =>
    request<Order>(`/staff/orders/${id}/prep-time`, {
      method: "PATCH",
      body: JSON.stringify({ minutes }),
    }),

  createFood: (body: any) => request<FoodItem>("/staff/food", { method: "POST", body: JSON.stringify(body) }),
  updateFood: (id: string, body: any) =>
    request<FoodItem>(`/staff/food/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteFood: (id: string) => request<{ ok: boolean }>(`/staff/food/${id}`, { method: "DELETE" }),
  patchAvailability: (id: string, body: { inStock?: boolean; isAvailable?: boolean }) =>
    request<FoodItem>(`/staff/food/${id}/availability`, { method: "PATCH", body: JSON.stringify(body) }),
  updateCanteenStatus: (body: { isOpen?: boolean; acceptingOrders?: boolean }) =>
    request<Canteen>("/staff/canteen/status", { method: "PATCH", body: JSON.stringify(body) }),
  getAnalytics: () => request<any>("/staff/analytics"),
};

// ----------------- Admin API -----------------
export const adminApi = {
  getDashboard: () => request<any>("/admin/dashboard"),
  getUsers: () => request<any[]>("/admin/users"),
  updateUserStatus: (id: string, status: "active" | "suspended") =>
    request<any>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getCanteens: () => request<Canteen[]>("/admin/canteens"),
  createCanteen: (body: any) => request<Canteen>("/admin/canteens", { method: "POST", body: JSON.stringify(body) }),
  updateCanteen: (id: string, body: any) =>
    request<Canteen>(`/admin/canteens/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCanteen: (id: string) => request<{ ok: boolean }>(`/admin/canteens/${id}`, { method: "DELETE" }),
  getOrders: (params?: { canteenId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.canteenId) q.set("canteenId", params.canteenId);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<Order[]>(`/admin/orders${qs ? `?${qs}` : ""}`);
  },
  getReviews: () => request<Review[]>("/admin/reviews"),
  patchReview: (id: string, body: { status?: string; reply?: string }) =>
    request<Review>(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getCategories: () => request<Category[]>("/admin/categories"),
  createCategory: (body: any) => request<Category>("/admin/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id: string, body: any) =>
    request<Category>(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request<{ ok: boolean }>(`/admin/categories/${id}`, { method: "DELETE" }),
  getSettings: () => request<PlatformSettings>("/admin/settings"),
  updateSettings: (body: Partial<PlatformSettings>) =>
    request<PlatformSettings>("/admin/settings", { method: "PATCH", body: JSON.stringify(body) }),
  getAnalytics: () => request<any>("/admin/analytics"),
};
