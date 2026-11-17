import { useApp } from "@/store/app-store";

/** The canteen the signed-in staff member manages (demo session). */
export function useStaffCanteen() {
  const id = useApp((s) => s.session.canteenId);
  const canteens = useApp((s) => s.canteens);
  const found = canteens.find((c) => c.id === id || c.code === id);
  return found || canteens[0] || ({} as any);
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
