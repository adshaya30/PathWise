import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'teal' | 'indigo' | 'purple';
}

export interface NavSection {
  title?: string; // e.g., "OVERVIEW", "MY A/L JOURNEY", "ASSISTANT"
  items: NavItem[];
}

export interface NavigationConfig {
  portalBadge: string;
  badgeColor?: string;
  sections?: NavSection[];
  mainNavItems?: NavItem[];
  bottomNavItems?: NavItem[];
}
