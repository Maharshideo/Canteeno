import { OrderStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { calculateEstimatedPrepTime } from "../utils/prepTime.js";
import { toFrontendStatus, toPrismaStatus } from "../utils/statusMapper.js";
import { notifyCanteen, notifyOrder, notifyUser } from "./socket.service.js";
import { createNotification } from "./notification.service.js";
import { canteenWhere } from "../utils/prismaHelpers.js";

interface CreateOrderItemInput {
  foodId: string;
  quantity: number;
}

interface CreateOrderInput {
  studentId: string;
  canteenId: string;
  items: CreateOrderItemInput[];
  pickupSlot?: string;
  note?: string;
  paymentMethod?: string;
}

export const formatOrderResponse = (order: any) => {
  const frontendStatus = toFrontendStatus(order.status);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.studentId,
    studentId: order.studentId,
    studentName: order.studentName,
    canteenId: order.canteenId,
    canteen: order.canteen,
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      foodId: item.foodItemId,
      name: item.itemName,
      price: item.unitPrice,
      qty: item.quantity,
      quantity: item.quantity,
      subtotal: item.subtotal,
      isVeg: item.isVeg,
    })),
    subtotal: order.subtotal,
    total: order.totalAmount,
    totalAmount: order.totalAmount,
    status: frontendStatus,
    rawStatus: order.status,
    prepMinutes: order.estimatedPreparationTime,
    estimatedPreparationTime: order.estimatedPreparationTime,
    pickupSlot: order.pickupSlot || "asap",
    note: order.note || "",
    paymentMethod: order.paymentMethod || "counter",
    placedAt: order.createdAt.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    history: Array.isArray(order.history) ? order.history : [{ status: frontendStatus, at: order.createdAt.toISOString() }],
    reason: order.reason || undefined,
    reviewed: Boolean(order.reviewed),
  };
};

export const createOrder = async (input: CreateOrderInput) => {
  // 1. Check platform settings
  const settings = await prisma.platformSettings.findFirst();
  if (settings && !settings.orderingEnabled) {
    throw new Error("Ordering is currently paused campus-wide.");
  }

  // 2. Fetch student
  const student = await prisma.user.findUnique({
    where: { id: input.studentId },
  });
  if (!student) {
    throw new Error("Student account not found.");
  }
  if (student.status === "suspended") {
    throw new Error("Your account is suspended.");
  }

  // 3. Check active orders count
  const activeStatuses = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP];
  const activeOrdersCount = await prisma.order.count({
    where: {
      studentId: student.id,
      status: { in: activeStatuses },
    },
  });
  const maxActive = settings?.maxActiveOrders ?? 3;
  if (activeOrdersCount >= maxActive) {
    throw new Error(`You can have at most ${maxActive} active orders at a time.`);
  }

  // 4. Find canteen
  const canteen = await prisma.canteen.findFirst({
    where: canteenWhere(input.canteenId),
  });
  if (!canteen) {
    throw new Error("Canteen not found.");
  }
  if (!canteen.isOpen || !canteen.acceptingOrders) {
    throw new Error(`${canteen.name} is not accepting orders right now.`);
  }

  // 5. Fetch and validate food items
  const foodIds = input.items.map((i) => i.foodId);
  const foods = await prisma.foodItem.findMany({
    where: {
      id: { in: foodIds },
    },
  });

  if (foods.length !== input.items.length) {
    throw new Error("One or more selected food items do not exist.");
  }

  // Validate that all items belong to this canteen
  for (const food of foods) {
    if (food.canteenId !== canteen.id) {
      throw new Error(`Item '${food.name}' does not belong to ${canteen.name}. All items must be from the same canteen.`);
    }
    if (!food.isAvailable) {
      throw new Error(`'${food.name}' is currently unavailable.`);
    }
    if (!food.inStock) {
      throw new Error(`'${food.name}' is currently out of stock.`);
    }
  }

  // 6. Calculate subtotal & server-side prices
  let subtotal = 0;
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const orderItemsData = input.items.map((item) => {
    const food = foodMap.get(item.foodId)!;
    const itemSubtotal = food.price * item.quantity;
    subtotal += itemSubtotal;
    return {
      foodItemId: food.id,
      itemName: food.name,
      quantity: item.quantity,
      unitPrice: food.price,
      subtotal: itemSubtotal,
      isVeg: food.isVeg,
    };
  });

  const totalAmount = subtotal; // Pickup is free

  // 7. Calculate estimated prep time based on kitchen queue
  const currentQueueLength = await prisma.order.count({
    where: {
      canteenId: canteen.id,
      status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING] },
    },
  });

  const prepItems = input.items.map((item) => {
    const food = foodMap.get(item.foodId)!;
    return { preparationTime: food.preparationTime, quantity: item.quantity };
  });
  const estimatedPrepTime = calculateEstimatedPrepTime(prepItems, currentQueueLength);

  // 8. Generate unique order number
  const orderNumber = generateOrderNumber(canteen.code);
  const now = new Date();
  const initialHistory = [{ status: "placed", at: now.toISOString() }];

  // 9. Create order and order items in database
  const createdOrder = await prisma.order.create({
    data: {
      orderNumber,
      studentId: student.id,
      studentName: student.name,
      canteenId: canteen.id,
      status: OrderStatus.PENDING,
      subtotal,
      totalAmount,
      estimatedPreparationTime: estimatedPrepTime,
      pickupSlot: input.pickupSlot || "asap",
      note: input.note || "",
      paymentMethod: input.paymentMethod || "counter",
      history: initialHistory,
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: true,
      canteen: {
        select: { id: true, name: true, code: true, location: true, image: true, phone: true },
      },
    },
  });

  // 10. Send real-time Socket.IO notification to staff
  const formattedOrder = formatOrderResponse(createdOrder);
  notifyCanteen(canteen.id, "order:new", formattedOrder);

  // 11. Create persistent student notification
  await createNotification({
    userId: student.id,
    orderId: createdOrder.id,
    title: "Order placed",
    message: `${orderNumber} sent to ${canteen.name}. Waiting for the canteen to accept.`,
    kind: "order",
  });

  return formattedOrder;
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  reason?: string,
  staffCanteenId?: string | null
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      canteen: true,
      items: true,
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  // Cross-canteen security check: staff can only update their own canteen's orders
  if (staffCanteenId && order.canteenId !== staffCanteenId) {
    throw new Error("Unauthorized: You can only manage orders for your assigned canteen.");
  }

  // Validate state transitions
  validateTransition(order.status, newStatus);

  const now = new Date();
  const currentHistory = Array.isArray(order.history) ? order.history : [];
  const updatedHistory = [
    ...currentHistory,
    { status: toFrontendStatus(newStatus), at: now.toISOString(), reason },
  ];

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      reason: reason || order.reason,
      history: updatedHistory,
    },
    include: {
      items: true,
      canteen: {
        select: { id: true, name: true, code: true, location: true, image: true, phone: true },
      },
    },
  });

  const formatted = formatOrderResponse(updatedOrder);

  // Real-time notifications
  notifyUser(order.studentId, "order:status_updated", formatted);
  notifyCanteen(order.canteenId, "order:status_updated", formatted);
  notifyOrder(order.id, "order:status_updated", formatted);

  // Notification copies
  const canteenName = order.canteen?.name || "The canteen";
  const statusCopy: Partial<Record<OrderStatus, [string, string]>> = {
    [OrderStatus.ACCEPTED]: [
      "Order accepted",
      `${canteenName} accepted ${order.orderNumber}. Estimated ${order.estimatedPreparationTime} min.`,
    ],
    [OrderStatus.PREPARING]: [
      "Your food is being prepared",
      `${canteenName} started preparing ${order.orderNumber}.`,
    ],
    [OrderStatus.READY_FOR_PICKUP]: [
      "Ready for pickup!",
      `${order.orderNumber} is ready at the ${canteenName} counter. Show your pickup code.`,
    ],
    [OrderStatus.COLLECTED]: [
      "Order collected",
      `Enjoy your meal! Rate ${canteenName}?`,
    ],
    [OrderStatus.REJECTED]: [
      "Order could not be accepted",
      `${canteenName} rejected ${order.orderNumber}${reason ? `: ${reason}` : "."}`,
    ],
    [OrderStatus.CANCELLED]: [
      "Order cancelled",
      `${order.orderNumber} was cancelled.`,
    ],
  };

  const copy = statusCopy[newStatus];
  if (copy) {
    await createNotification({
      userId: order.studentId,
      orderId: order.id,
      title: copy[0],
      message: copy[1],
      kind: "order",
    });
  }

  return formatted;
};

const validateTransition = (current: OrderStatus, target: OrderStatus) => {
  if (current === target) return;

  // Cannot transition out of terminal states
  if (([OrderStatus.COLLECTED, OrderStatus.REJECTED, OrderStatus.CANCELLED] as OrderStatus[]).includes(current)) {
    throw new Error(`Cannot change status of an order that is already ${current}.`);
  }

  // Allowed paths:
  // PENDING -> ACCEPTED, REJECTED, CANCELLED
  // ACCEPTED -> PREPARING, REJECTED, CANCELLED
  // PREPARING -> READY_FOR_PICKUP
  // READY_FOR_PICKUP -> COLLECTED
  if (target === OrderStatus.REJECTED && !([OrderStatus.PENDING, OrderStatus.ACCEPTED] as OrderStatus[]).includes(current)) {
    throw new Error(`Cannot reject order in ${current} stage.`);
  }

  if (target === OrderStatus.CANCELLED && !([OrderStatus.PENDING] as OrderStatus[]).includes(current)) {
    throw new Error("Orders can only be cancelled while pending acceptance.");
  }

  if (target === OrderStatus.PREPARING && !([OrderStatus.ACCEPTED, OrderStatus.PENDING] as OrderStatus[]).includes(current)) {
    throw new Error(`Cannot mark order as preparing from ${current}.`);
  }

  if (target === OrderStatus.READY_FOR_PICKUP && !([OrderStatus.PREPARING, OrderStatus.ACCEPTED] as OrderStatus[]).includes(current)) {
    throw new Error(`Cannot mark order as ready from ${current}.`);
  }

  if (target === OrderStatus.COLLECTED && current !== OrderStatus.READY_FOR_PICKUP) {
    throw new Error("Order must be marked ready before it can be collected.");
  }
};
