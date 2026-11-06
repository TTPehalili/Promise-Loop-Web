// Line icons for the trades named in content/site.ts (industries.pills).
// Names verified against lucide-react 1.x. Unknown labels fall back to Wrench.
import { AirVent, Bug, BrushCleaning, Droplets, House, Leaf, Wrench, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  hvac: AirVent,
  plumbing: Droplets,
  electrical: Zap,
  roofing: House,
  landscaping: Leaf,
  "pest control": Bug,
  cleaning: BrushCleaning,
};

export function tradeIcon(label: string): LucideIcon {
  return ICONS[label.trim().toLowerCase()] ?? Wrench;
}
