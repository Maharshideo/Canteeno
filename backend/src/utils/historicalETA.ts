/**
 * historicalETA.ts
 * ─────────────────────────────────────────────────────────────────
 * Calculates a smart estimated wait-time for new orders at a canteen.
 *
 * Algorithm
 * ──────────
 * 1. Pull up to HISTORY_WINDOW recent COLLECTED orders for the canteen
 *    from the last HISTORY_DAYS days.
 * 2. For each order, read the `history` JSON array and find the elapsed
 *    time between the "placed" event and the "ready" event (minutes).
 * 3. Compute a weighted average (recent orders weighed 2×).
 * 4. Add a queue-penalty: each order currently PENDING / ACCEPTED /
 *    PREPARING at that canteen adds QUEUE_PENALTY_MINUTES.
 * 5. Return result with a confidence label based on sample size.
 *
 * NOTE: Results are estimates only and must not be presented as
 * guaranteed delivery promises.
 */

import { OrderStatus } from "@prisma/client";
import { prisma } from "../config/database.js";

const HISTORY_DAYS = 14;        // Look back this many days
const HISTORY_WINDOW = 60;      // Max orders to analyse
const QUEUE_PENALTY = 2.5;      // Extra minutes per active order in queue
const MIN_PREP_MINUTES = 5;     // Floor for returned estimate
const MAX_PREP_MINUTES = 90;    // Ceiling for returned estimate

export interface ETAResult {
  estimatedMinutes: number;     // Total estimated wait from now (min)
  historicalAvgMinutes: number; // Historical avg (excluding queue)
  queueLength: number;          // Current active orders at canteen
  queuePenaltyMinutes: number;  // Extra minutes added for queue
  sampleSize: number;           // Number of orders used in average
  confidence: "high" | "medium" | "low" | "none";
  windowDays: number;
  note: string;                 // Human-readable explanation
}

function parseHistoryMinutes(history: unknown): number | null {
  if (!Array.isArray(history)) return null;

  // Events look like: [{ status: "placed", at: "ISO" }, { status: "ready", at: "ISO" }, ...]
  const placed = history.find(
    (e: any) => e?.status === "placed" && typeof e?.at === "string"
  );
  const ready = history.find(
    (e: any) =>
      (e?.status === "ready" || e?.status === "ready_for_pickup") &&
      typeof e?.at === "string"
  );

  if (!placed || !ready) return null;

  const start = new Date(placed.at).getTime();
  const end = new Date(ready.at).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;

  const mins = (end - start) / 60_000;
  // Sanity: ignore if outside realistic range (1 – 120 min)
  if (mins < 1 || mins > 120) return null;
  return Math.round(mins);
}

function weightedAverage(values: number[]): number {
  if (values.length === 0) return 0;
  // Most-recent orders (later in array) get weight 2, older get weight 1
  const half = Math.floor(values.length / 2);
  let sum = 0;
  let totalWeight = 0;
  values.forEach((v, i) => {
    const w = i >= half ? 2 : 1;
    sum += v * w;
    totalWeight += w;
  });
  return Math.round(sum / totalWeight);
}

function confidenceLabel(n: number): ETAResult["confidence"] {
  if (n === 0) return "none";
  if (n < 5) return "low";
  if (n < 20) return "medium";
  return "high";
}

export async function calculateHistoricalETA(canteenId: string): Promise<ETAResult> {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

  // 1. Historical COLLECTED orders within window
  const collectedOrders = await prisma.order.findMany({
    where: {
      canteenId,
      status: OrderStatus.COLLECTED,
      createdAt: { gte: since },
    },
    select: { history: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: HISTORY_WINDOW,
  });

  // 2. Extract individual prep durations
  const durations: number[] = [];
  for (const order of collectedOrders) {
    const mins = parseHistoryMinutes(order.history);
    if (mins !== null) durations.push(mins);
  }

  // 3. Calculate weighted historical average
  const historicalAvg = durations.length > 0 ? weightedAverage(durations) : 0;

  // 4. Current queue length
  const activeStatuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
  ];
  const queueLength = await prisma.order.count({
    where: {
      canteenId,
      status: { in: activeStatuses },
    },
  });

  const queuePenaltyMinutes = Math.round(queueLength * QUEUE_PENALTY);

  // 5. Compose estimate
  let estimatedMinutes: number;
  const confidence = confidenceLabel(durations.length);

  if (durations.length === 0) {
    // No history — fall back to canteen's static prepTime
    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
      select: { prepTime: true },
    });
    const baseFallback = canteen?.prepTime ?? 15;
    estimatedMinutes = baseFallback + queuePenaltyMinutes;
  } else {
    estimatedMinutes = historicalAvg + queuePenaltyMinutes;
  }

  // Apply floor and ceiling
  estimatedMinutes = Math.max(MIN_PREP_MINUTES, Math.min(MAX_PREP_MINUTES, estimatedMinutes));

  // 6. Human-readable note
  let note: string;
  if (confidence === "none") {
    note = `No order history yet. Showing canteen's default estimate${queueLength > 0 ? ` + ${queueLength} orders ahead of you` : ""}.`;
  } else {
    note = `Based on ${durations.length} recent order${durations.length !== 1 ? "s" : ""} at this canteen over the last ${HISTORY_DAYS} days${queueLength > 0 ? `, plus ${queueLength} active order${queueLength !== 1 ? "s" : ""} in the queue` : ""}.`;
  }

  return {
    estimatedMinutes,
    historicalAvgMinutes: historicalAvg,
    queueLength,
    queuePenaltyMinutes,
    sampleSize: durations.length,
    confidence,
    windowDays: HISTORY_DAYS,
    note,
  };
}
