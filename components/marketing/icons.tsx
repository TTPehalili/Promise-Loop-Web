// Explicit map from content icon names to lucide-react components (no `import *`).
import {
  CirclePause,
  Clock,
  Database,
  FileText,
  Gauge,
  Mail,
  MessageSquare,
  Phone,
  PhoneOff,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/content/site";

export const ICONS: Record<IconName, LucideIcon> = {
  Phone,
  MessageSquare,
  Mail,
  Database,
  Clock,
  Gauge,
  ShieldCheck,
  CirclePause,
  PhoneOff,
  FileText,
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const C = ICONS[name];
  return <C size={20} strokeWidth={1.5} aria-hidden="true" className={className} />;
}
