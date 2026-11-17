import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import type {
  AppNotification,
  Canteen,
  Cart,
  Category,
  FoodItem,
  Order,
  OrderStatus,
  PaymentMethod,
  PlatformSettings,
  Review,
  Session,
  Student,
} from "@/lib/types";
import {
  seedCanteens,
  seedCategories,
  seedFoods,
  seedSettings,
  seedStudents,
} from "@/data/seed";
import {
  canTransition,
  cartLines,
  checkAddToCart,
  isActive,
  STATUS_LABEL,
  type AddCheck,
} from "@/lib/order-logic";
import {
  adminApi,
  authApi,
  canteensApi,
  categoriesApi,
  foodApi,
  getAuthToken,
  notificationsApi,
  ordersApi,
  reviewsApi,
  setAuthToken,
  staffApi,
} from "@/lib/api";
import { getSocket, reconnectSocketWithToken, subscribeToCanteen } from "@/lib/socket";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
const nowIso = () => new Date().toISOString();

interface Data {
  canteens: Canteen[];
  foods: FoodItem[];
  categories: Category[];
  students: Student[];
  orders: Order[];
  notifications: AppNotification[];
  reviews: Review[];
  settings: PlatformSettings;
  cart: Cart;
  session: Session;
}

interface Actions {
  // sync
  syncWithBackend: () => Promise<void>;
  // auth
  loginStudent: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }> | { ok: true } | { ok: false; error: string };
  signupStudent: (input: Pick<Student, "name" | "email" | "password" | "phone" | "rollNo" | "hostel">) => Promise<{ ok: true } | { ok: false; error: string }> | { ok: true } | { ok: false; error: string };
  loginStaff: (canteenId: string) => Promise<void> | void;
  loginAdmin: () => Promise<void> | void;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<Student, "name" | "phone" | "rollNo" | "hostel" | "email">>) => Promise<void> | void;
  // favourites
  toggleFavouriteFood: (foodId: string) => boolean | null;
  toggleFavouriteCanteen: (canteenId: string) => boolean | null;
  // cart
  addToCart: (foodId: string, qty?: number) => AddCheck;
  replaceCartWith: (foodId: string, qty?: number) => void;
  setQty: (foodId: string, qty: number) => void;
  removeFromCart: (foodId: string) => void;
  clearCart: () => void;
  // orders
  placeOrder: (input: { paymentMethod: PaymentMethod; note: string; pickupSlot: string }) => Promise<{ ok: true; order: Order } | { ok: false; error: string }> | { ok: true; order: Order } | { ok: false; error: string };
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean> | boolean;
  reorder: (orderId: string) => { added: number; skipped: number };
  // staff
  setOrderStatus: (orderId: string, status: OrderStatus, reason?: string) => Promise<boolean> | boolean;
  setOrderPrep: (orderId: string, minutes: number) => Promise<void> | void;
  // menu
  upsertFood: (food: Omit<FoodItem, "id"> & { id?: string | undefined }) => Promise<FoodItem> | FoodItem;
  deleteFood: (foodId: string) => Promise<void> | void;
  patchFood: (foodId: string, patch: Partial<FoodItem>) => Promise<void> | void;
  // categories
  upsertCategory: (cat: Omit<Category, "id"> & { id?: string | undefined }) => Promise<void> | void;
  deleteCategory: (id: string) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
  // canteens
  upsertCanteen: (c: Omit<Canteen, "id" | "isDemo"> & { id?: string | undefined }) => Promise<Canteen> | Canteen;
  patchCanteen: (id: string, patch: Partial<Canteen>) => Promise<void> | void;
  deleteCanteen: (id: string) => Promise<void> | void;
  // students
  setStudentStatus: (id: string, status: Student["status"]) => Promise<void> | void;
  // reviews
  addReview: (input: { canteenId: string; orderId?: string | undefined; rating: number; comment: string }) => Promise<void> | void;
  patchReview: (id: string, patch: Partial<Review>) => Promise<void> | void;
  // notifications
  markNotificationRead: (id: string) => Promise<void> | void;
  markAllNotificationsRead: () => Promise<void> | void;
  // settings
  updateSettings: (patch: Partial<PlatformSettings>) => Promise<void> | void;
  resetDemo: () => void;
}

export type AppState = Data & Actions & { hydrated: boolean };

const initialData = (): Data => ({
  canteens: seedCanteens,
  foods: seedFoods,
  categories: seedCategories,
  students: seedStudents,
  orders: [],
  notifications: [],
  reviews: [],
  settings: seedSettings,
  cart: { canteenId: null, items: [] },
  session: { role: null, userId: null, canteenId: null },
});

let socketInitialized = false;

function setupSocketListeners(set: any, get: any) {
  if (typeof window === "undefined" || socketInitialized) return;
  socketInitialized = true;

  const socket = getSocket();

  socket.on("order:new", (order: Order) => {
    set((state: AppState) => {
      const exists = state.orders.some((o) => o.id === order.id);
      if (exists) return state;
      return { orders: [order, ...state.orders] };
    });
    toast.info(`New incoming order: ${order.orderNumber}`);
  });

  socket.on("order:status_updated", (updatedOrder: Order) => {
    set((state: AppState) => ({
      orders: state.orders.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)),
    }));
    toast.success(`Order ${updatedOrder.orderNumber}: ${STATUS_LABEL[updatedOrder.status] || updatedOrder.status}`);
  });

  socket.on("notification:new", (notification: AppNotification) => {
    set((state: AppState) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      return { notifications: [notification, ...state.notifications] };
    });
    toast(notification.title, { description: notification.body });
  });
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      hydrated: false,

      syncWithBackend: async () => {
        try {
          setupSocketListeners(set, get);

          // Fetch public catalog
          const [canteensRes, foodsRes, catsRes, settingsRes, reviewsRes] = await Promise.all([
            canteensApi.getAll(),
            foodApi.getAll(),
            categoriesApi.getAll(),
            adminApi.getSettings(),
            reviewsApi.getAll(),
          ]);

          const patch: Partial<Data> = {};
          if (canteensRes.success && canteensRes.data?.length) {
            patch.canteens = canteensRes.data.map((c: any) => ({
              ...c,
              isDemo: true,
              openingHours: Array.isArray(c.openingHours) && c.openingHours.length > 0 ? c.openingHours : [
                { day: "Mon", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
                { day: "Tue", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
                { day: "Wed", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
                { day: "Thu", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
                { day: "Fri", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
                { day: "Sat", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
                { day: "Sun", open: c.openingTime || "08:00", close: c.closingTime || "22:00", closed: false },
              ],
            }));
          }
          if (foodsRes.success && foodsRes.data?.length) {
            patch.foods = foodsRes.data.map((f: any) => ({
              ...f,
              prepTime: f.prepTime ?? f.preparationTime ?? 10,
              available: f.available ?? f.isAvailable ?? true,
              inStock: f.inStock !== false,
            }));
          }
          if (catsRes.success && catsRes.data?.length) {
            patch.categories = catsRes.data;
          }
          if (settingsRes.success && settingsRes.data) {
            patch.settings = settingsRes.data;
          }
          if (reviewsRes.success && reviewsRes.data) {
            patch.reviews = reviewsRes.data;
          }

          // If student logged in, fetch user data
          const token = getAuthToken();
          const { session } = get();

          if (token && session.role === "student") {
            const [meRes, ordersRes, ntfRes] = await Promise.all([
              authApi.getMe(),
              ordersApi.getMyOrders(),
              notificationsApi.getAll(),
            ]);

            if (meRes.success && meRes.data) {
              patch.students = [meRes.data];
              patch.session = { role: "student", userId: meRes.data.id, canteenId: null };
            }
            if (ordersRes.success && ordersRes.data) {
              patch.orders = ordersRes.data;
            }
            if (ntfRes.success && ntfRes.data) {
              patch.notifications = ntfRes.data;
            }
          } else if (session.role === "staff" && session.canteenId) {
            subscribeToCanteen(session.canteenId);
            const staffOrders = await staffApi.getOrders(session.canteenId);
            if (staffOrders.success && staffOrders.data) {
              patch.orders = staffOrders.data;
            }
          } else if (session.role === "admin") {
            const adminOrders = await adminApi.getOrders();
            if (adminOrders.success && adminOrders.data) {
              patch.orders = adminOrders.data;
            }
          }

          set((s) => ({ ...s, ...patch }));
        } catch (err) {
          console.error("Backend sync failed, using cached state:", err);
        }
      },

      loginStudent: async (email, password) => {
        try {
          const res = await authApi.login(email, password);
          if (!res.success || !res.data) {
            return { ok: false, error: res.error || "Login failed" };
          }

          const { user, token } = res.data;
          setAuthToken(token);
          reconnectSocketWithToken(token);

          // Fetch student orders & notifications
          const [ordersRes, ntfRes] = await Promise.all([
            ordersApi.getMyOrders(),
            notificationsApi.getAll(),
          ]);

          set((st) => ({
            session: { role: "student", userId: user.id, canteenId: null },
            students: [user, ...st.students.filter((s) => s.id !== user.id)],
            orders: ordersRes.success && ordersRes.data ? ordersRes.data : st.orders,
            notifications: ntfRes.success && ntfRes.data ? ntfRes.data : st.notifications,
          }));

          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: err.message || "Failed to log in" };
        }
      },

      signupStudent: async (input) => {
        try {
          const res = await authApi.register(input);
          if (!res.success || !res.data) {
            return { ok: false, error: res.error || "Sign up failed" };
          }

          const { user, token } = res.data;
          setAuthToken(token);
          reconnectSocketWithToken(token);

          set((st) => ({
            session: { role: "student", userId: user.id, canteenId: null },
            students: [user, ...st.students.filter((s) => s.id !== user.id)],
            orders: [],
            notifications: [
              {
                id: uid("ntf"),
                userId: user.id,
                title: "Welcome to Canteeno",
                body: "Order ahead, skip the queue, and pick up when your food is ready.",
                at: nowIso(),
                read: false,
                kind: "system",
              },
            ],
          }));

          return { ok: true };
        } catch (err: any) {
          return { ok: false, error: err.message || "Failed to create account" };
        }
      },

      loginStaff: async (canteenId) => {
        try {
          // Find canteen
          const canteen = get().canteens.find((c) => c.id === canteenId || c.code === canteenId);
          const canteenCode = canteen?.code || "nescafe";

          // Log in with staff account for that canteen
          const staffLogin = await authApi.login(`staff.${canteenCode}@campus.edu`, "staff1234");
          if (staffLogin.success && staffLogin.data?.token) {
            setAuthToken(staffLogin.data.token);
            reconnectSocketWithToken(staffLogin.data.token);
          }

          const id = canteen?.id || canteenId;
          subscribeToCanteen(id);
          const staffOrders = await staffApi.getOrders(id);

          set({
            session: { role: "staff", userId: null, canteenId: id },
            orders: staffOrders.success && staffOrders.data ? staffOrders.data : get().orders,
          });
        } catch (e) {
          set({ session: { role: "staff", userId: null, canteenId } });
        }
      },

      loginAdmin: async () => {
        try {
          const adminLogin = await authApi.login("admin@campus.edu", "admin1234");
          if (adminLogin.success && adminLogin.data?.token) {
            setAuthToken(adminLogin.data.token);
            reconnectSocketWithToken(adminLogin.data.token);
          }
          const adminOrders = await adminApi.getOrders();
          set({
            session: { role: "admin", userId: null, canteenId: null },
            orders: adminOrders.success && adminOrders.data ? adminOrders.data : get().orders,
          });
        } catch (e) {
          set({ session: { role: "admin", userId: null, canteenId: null } });
        }
      },

      logout: () => {
        setAuthToken(null);
        reconnectSocketWithToken(null);
        set({
          session: { role: null, userId: null, canteenId: null },
          cart: { canteenId: null, items: [] },
        });
      },

      updateProfile: async (patch) => {
        const id = get().session.userId;
        if (!id) return;
        set((st) => ({
          students: st.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
        await authApi.updateProfile(patch);
      },

      toggleFavouriteFood: (foodId) => {
        const id = get().session.userId;
        if (!id) return null;
        let added = false;
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            added = !s.favouriteFoods.includes(foodId);
            return {
              ...s,
              favouriteFoods: added
                ? [...s.favouriteFoods, foodId]
                : s.favouriteFoods.filter((f) => f !== foodId),
            };
          }),
        }));
        authApi.toggleFavouriteFood(foodId).catch(console.error);
        return added;
      },

      toggleFavouriteCanteen: (canteenId) => {
        const id = get().session.userId;
        if (!id) return null;
        let added = false;
        set((st) => ({
          students: st.students.map((s) => {
            if (s.id !== id) return s;
            added = !s.favouriteCanteens.includes(canteenId);
            return {
              ...s,
              favouriteCanteens: added
                ? [...s.favouriteCanteens, canteenId]
                : s.favouriteCanteens.filter((f) => f !== canteenId),
            };
          }),
        }));
        authApi.toggleFavouriteCanteen(canteenId).catch(console.error);
        return added;
      },

      addToCart: (foodId, qty = 1) => {
        const { foods, canteens, cart } = get();
        const food = foods.find((f) => f.id === foodId);
        const canteen = food && canteens.find((c) => c.id === food.canteenId);
        if (!food || !canteen) return { ok: false, reason: "unavailable" };
        const check = checkAddToCart(cart, food, canteen, qty);
        if (!check.ok) return check;
        const exists = cart.items.some((l) => l.foodId === foodId);
        set({
          cart: {
            canteenId: food.canteenId,
            items: exists
              ? cart.items.map((l) => (l.foodId === foodId ? { ...l, qty: l.qty + qty } : l))
              : [...cart.items, { foodId, qty }],
          },
        });
        return check;
      },

      replaceCartWith: (foodId, qty = 1) => {
        const food = get().foods.find((f) => f.id === foodId);
        if (!food) return;
        set({ cart: { canteenId: food.canteenId, items: [{ foodId, qty }] } });
      },

      setQty: (foodId, qty) => {
        if (qty <= 0) return get().removeFromCart(foodId);
        set((st) => ({
          cart: {
            ...st.cart,
            items: st.cart.items.map((l) => (l.foodId === foodId ? { ...l, qty: Math.min(qty, 10) } : l)),
          },
        }));
      },

      removeFromCart: (foodId) =>
        set((st) => {
          const items = st.cart.items.filter((l) => l.foodId !== foodId);
          return { cart: { canteenId: items.length ? st.cart.canteenId : null, items } };
        }),

      clearCart: () => set({ cart: { canteenId: null, items: [] } }),

      placeOrder: async ({ paymentMethod, note, pickupSlot }) => {
        const st = get();
        if (!st.cart.canteenId || st.cart.items.length === 0) {
          return { ok: false, error: "Your cart is empty." };
        }

        try {
          const res = await ordersApi.create({
            canteenId: st.cart.canteenId,
            items: st.cart.items.map((l) => ({ foodId: l.foodId, quantity: l.qty })),
            pickupSlot,
            note,
            paymentMethod,
          });

          if (!res.success || !res.data) {
            return { ok: false, error: res.error || "Failed to place order." };
          }

          const order = res.data;
          set((s) => ({
            orders: [order, ...s.orders],
            cart: { canteenId: null, items: [] },
          }));

          return { ok: true, order };
        } catch (err: any) {
          return { ok: false, error: err.message || "Failed to place order." };
        }
      },

      cancelOrder: async (orderId, reason = "Cancelled by student") => {
        const o = get().orders.find((x) => x.id === orderId);
        if (!o || !canTransition(o.status, "cancelled")) return false;

        try {
          const res = await ordersApi.cancel(orderId, reason);
          if (res.success && res.data) {
            set((st) => ({
              orders: st.orders.map((ord) => (ord.id === orderId ? res.data! : ord)),
            }));
            return true;
          }
        } catch (e) {
          console.error(e);
        }
        return false;
      },

      reorder: (orderId) => {
        const st = get();
        const o = st.orders.find((x) => x.id === orderId);
        if (!o) return { added: 0, skipped: 0 };
        const okLines = o.items.filter((l) => {
          const f = st.foods.find((x) => x.id === l.foodId);
          return f && f.inStock && f.available;
        });
        set({
          cart: {
            canteenId: okLines.length ? o.canteenId : null,
            items: okLines.map((l) => ({ foodId: l.foodId, qty: l.qty })),
          },
        });
        return { added: okLines.length, skipped: o.items.length - okLines.length };
      },

      setOrderStatus: async (orderId, status, reason) => {
        const st = get();
        const o = st.orders.find((x) => x.id === orderId);
        if (!o || !canTransition(o.status, status)) return false;

        try {
          let res;
          if (status === "accepted") res = await staffApi.acceptOrder(orderId);
          else if (status === "rejected") res = await staffApi.rejectOrder(orderId, reason);
          else if (status === "preparing") res = await staffApi.markPreparing(orderId);
          else if (status === "ready") res = await staffApi.markReady(orderId);
          else if (status === "collected") res = await staffApi.markCollected(orderId);

          if (res?.success && res.data) {
            set((s) => ({
              orders: s.orders.map((x) => (x.id === orderId ? res.data! : x)),
            }));
            return true;
          }
        } catch (e) {
          console.error(e);
        }

        // Optimistic local fallback
        const at = nowIso();
        const updated: Order = {
          ...o,
          status,
          reason: reason ?? o.reason,
          history: [...o.history, { status, at }],
        };
        set((s) => ({
          orders: s.orders.map((x) => (x.id === orderId ? updated : x)),
        }));
        return true;
      },

      setOrderPrep: async (orderId, minutes) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, prepMinutes: Math.max(1, Math.min(120, minutes)) } : o
          ),
        }));
        await staffApi.updatePrepTime(orderId, minutes).catch(console.error);
      },

      upsertFood: async (food) => {
        const isUpdate = Boolean(food.id);
        let saved: FoodItem;

        if (isUpdate && food.id) {
          const res = await staffApi.updateFood(food.id, food);
          saved = res.success && res.data ? res.data : ({ ...food, id: food.id } as FoodItem);
        } else {
          const res = await staffApi.createFood(food);
          saved = res.success && res.data ? res.data : ({ ...food, id: uid(`${food.canteenId}--item`) } as FoodItem);
        }

        set((s) => ({
          foods: food.id ? s.foods.map((f) => (f.id === food.id ? saved : f)) : [saved, ...s.foods],
        }));
        return saved;
      },

      deleteFood: async (foodId) => {
        set((s) => ({
          foods: s.foods.filter((f) => f.id !== foodId),
          cart: { ...s.cart, items: s.cart.items.filter((l) => l.foodId !== foodId) },
        }));
        await staffApi.deleteFood(foodId).catch(console.error);
      },

      patchFood: async (foodId, patch) => {
        set((s) => ({ foods: s.foods.map((f) => (f.id === foodId ? { ...f, ...patch } : f)) }));
        await staffApi.patchAvailability(foodId, patch).catch(console.error);
      },

      upsertCategory: async (cat) => {
        if (cat.id) {
          await adminApi.updateCategory(cat.id, cat).catch(console.error);
        } else {
          await adminApi.createCategory(cat).catch(console.error);
        }
        const catsRes = await categoriesApi.getAll();
        if (catsRes.success && catsRes.data) {
          set({ categories: catsRes.data });
        }
      },

      deleteCategory: async (id) => {
        const used = get().foods.filter((f) => f.categoryId === id).length;
        if (used) {
          return {
            ok: false,
            error: `${used} food items still use this category. Move them first or hide the category instead.`,
          };
        }
        const res = await adminApi.deleteCategory(id);
        if (res.success) {
          set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
          return { ok: true };
        }
        return { ok: false, error: res.error || "Failed to delete category" };
      },

      upsertCanteen: async (c) => {
        let saved: Canteen;
        if (c.id) {
          const res = await adminApi.updateCanteen(c.id, c);
          saved = res.success && res.data ? { ...res.data, isDemo: true } : ({ ...c, id: c.id, isDemo: true } as Canteen);
        } else {
          const res = await adminApi.createCanteen(c);
          saved = res.success && res.data ? { ...res.data, isDemo: true } : ({ ...c, id: uid("cnt"), isDemo: true } as Canteen);
        }

        set((s) => ({
          canteens: c.id ? s.canteens.map((x) => (x.id === c.id ? saved : x)) : [...s.canteens, saved],
        }));
        return saved;
      },

      patchCanteen: async (id, patch) => {
        set((s) => ({ canteens: s.canteens.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        await adminApi.updateCanteen(id, patch).catch(console.error);
      },

      deleteCanteen: async (id) => {
        set((s) => ({
          canteens: s.canteens.filter((c) => c.id !== id),
          foods: s.foods.filter((f) => f.canteenId !== id),
          cart: s.cart.canteenId === id ? { canteenId: null, items: [] } : s.cart,
        }));
        await adminApi.deleteCanteen(id).catch(console.error);
      },

      setStudentStatus: async (id, status) => {
        set((s) => ({ students: s.students.map((x) => (x.id === id ? { ...x, status } : x)) }));
        await adminApi.updateUserStatus(id, status).catch(console.error);
      },

      addReview: async ({ canteenId, orderId, rating, comment }) => {
        const st = get();
        const user = st.students.find((s) => s.id === st.session.userId);
        if (!user) return;

        try {
          const res = await reviewsApi.create({ canteenId, orderId, rating, comment });
          if (res.success && res.data) {
            set((s) => ({
              reviews: [res.data!, ...s.reviews],
              orders: orderId ? s.orders.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)) : s.orders,
            }));
            return;
          }
        } catch (e) {
          console.error(e);
        }

        // Local fallback
        set((s) => ({
          reviews: [
            {
              id: uid("rev"),
              userId: user.id,
              studentName: user.name,
              canteenId,
              orderId,
              rating,
              comment: comment.trim(),
              at: nowIso(),
              status: "published",
            },
            ...s.reviews,
          ],
          orders: orderId ? s.orders.map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)) : s.orders,
        }));
      },

      patchReview: async (id, patch) => {
        set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        await adminApi.patchReview(id, patch).catch(console.error);
      },

      markNotificationRead: async (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        await notificationsApi.markRead(id).catch(console.error);
      },

      markAllNotificationsRead: async () => {
        const id = get().session.userId;
        set((s) => ({
          notifications: s.notifications.map((n) => (n.userId === id ? { ...n, read: true } : n)),
        }));
        await notificationsApi.markAllRead().catch(console.error);
      },

      updateSettings: async (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        await adminApi.updateSettings(patch).catch(console.error);
      },

      resetDemo: () => set({ ...initialData() }),
    }),
    {
      name: "canteeno-demo-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ hydrated: _h, ...rest }) =>
        Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<AppState>,
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
        // Automatically sync live catalog and user orders from backend
        useApp.getState().syncWithBackend();
      },
    }
  )
);

// ---- selectors / hooks ----
export const useHydrated = () => useApp((s) => s.hydrated);

export const useCurrentStudent = () =>
  useApp((s) => (s.session.role === "student" ? s.students.find((u) => u.id === s.session.userId) ?? null : null));

export const useCartCount = () => useApp((s) => s.cart.items.reduce((n, l) => n + l.qty, 0));
