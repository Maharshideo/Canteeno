import { OrderStatus } from "@prisma/client";

export type FrontendOrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "collected"
  | "cancelled"
  | "rejected";

export const toPrismaStatus = (status: string): OrderStatus => {
  const s = status.toLowerCase();
  switch (s) {
    case "placed":
    case "pending":
      return OrderStatus.PENDING;
    case "accepted":
      return OrderStatus.ACCEPTED;
    case "preparing":
      return OrderStatus.PREPARING;
    case "ready":
    case "ready_for_pickup":
      return OrderStatus.READY_FOR_PICKUP;
    case "collected":
      return OrderStatus.COLLECTED;
    case "rejected":
      return OrderStatus.REJECTED;
    case "cancelled":
      return OrderStatus.CANCELLED;
    default:
      return OrderStatus.PENDING;
  }
};

export const toFrontendStatus = (status: OrderStatus | string): FrontendOrderStatus => {
  switch (status) {
    case OrderStatus.PENDING:
    case "PENDING":
    case "placed":
      return "placed";
    case OrderStatus.ACCEPTED:
    case "ACCEPTED":
    case "accepted":
      return "accepted";
    case OrderStatus.PREPARING:
    case "PREPARING":
    case "preparing":
      return "preparing";
    case OrderStatus.READY_FOR_PICKUP:
    case "READY_FOR_PICKUP":
    case "ready":
      return "ready";
    case OrderStatus.COLLECTED:
    case "COLLECTED":
    case "collected":
      return "collected";
    case OrderStatus.REJECTED:
    case "REJECTED":
    case "rejected":
      return "rejected";
    case OrderStatus.CANCELLED:
    case "CANCELLED":
    case "cancelled":
      return "cancelled";
    default:
      return "placed";
  }
};
