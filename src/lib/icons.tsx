"use client";

import {
  Satellite,
  Rocket,
  Building2,
  Wrench,
  Radio,
  Flag,
  Globe,
  Globe2,
  Users,
  GraduationCap,
  Building,
  Landmark,
  CircleDot,
  Circle,
  Hexagon,
  Pentagon,
  Target,
  Moon,
  ClipboardCheck,
  FileCheck,
  FileText,
  FileSignature,
  Leaf,
  Shield,
  LayoutDashboard,
  Bell,
  Search,
  Award,
  AlertTriangle,
  Eye,
  type LucideIcon,
} from "lucide-react";

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
  Satellite,
  Rocket,
  Building2,
  Wrench,
  Radio,
  Flag,
  Globe,
  Globe2,
  Users,
  GraduationCap,
  Building,
  Landmark,
  CircleDot,
  Circle,
  Hexagon,
  Pentagon,
  Target,
  Moon,
  ClipboardCheck,
  FileCheck,
  FileText,
  FileSignature,
  Leaf,
  Shield,
  LayoutDashboard,
  Bell,
  Search,
  Award,
  AlertTriangle,
  Eye,
  // Add Orbit as an alias to CircleDot
  Orbit: CircleDot,
};

export function getIcon(name: string): LucideIcon | null {
  return iconMap[name] || null;
}

export type { LucideIcon };
