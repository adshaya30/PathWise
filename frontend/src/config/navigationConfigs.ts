import {
  LayoutDashboard,
  FileText,
  Layers,
  BookOpen,
  Landmark,
  GraduationCap,
  ClipboardCheck,
  Sliders,
  Users,
  Compass,
  CheckCircle2,
  Bookmark,
  Briefcase,
  Settings,
  LogOut,
  Sparkles,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import type { NavItem, NavSection } from '../types/navigation';

// ==========================================
// 1. ADMIN PORTAL NAVIGATION
// ==========================================
export const adminNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Documents', path: '/admin/documents', icon: FileText },
  { name: 'A/L Streams', path: '/admin/streams', icon: Layers },
  { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
  { name: 'Universities', path: '/admin/universities', icon: Landmark },
  { name: 'Courses', path: '/admin/courses', icon: GraduationCap },
  { name: 'Admission Requirements', path: '/admin/admission-requirements', icon: ClipboardCheck },
  { name: 'Sources', path: '/admin/sources', icon: Sliders },
  { name: 'Users', path: '/admin/users', icon: Users },
];

export const adminBottomNavItems: NavItem[] = [
  { name: 'Settings', path: '/admin/settings', icon: Settings },
  { name: 'Logout', path: '/login', icon: LogOut },
];

// ==========================================
// 2. AFTER A/L STUDENT PORTAL NAVIGATION
// ==========================================
export const afterAlNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/after-al/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'My A/L Journey',
    items: [
      { name: 'My A/L Results', path: '/after-al/results', icon: GraduationCap },
      { name: 'Check Eligibility', path: '/after-al/eligibility', icon: CheckCircle2, badge: 3 },
      { name: 'University Courses', path: '/after-al/courses', icon: Landmark },
      { name: 'Compare Courses', path: '/after-al/compare', icon: BarChart2 },
      { name: 'Z-Score Info', path: '/after-al/zscore', icon: TrendingUp },
      { name: 'Saved Courses', path: '/after-al/saved', icon: Bookmark },
    ],
  },
  {
    title: 'Assistant',
    items: [
      { name: 'PathWise AI', path: '/after-al/ai', icon: Sparkles },
    ],
  },
];

// Flat fallback
export const afterAlNavItems: NavItem[] = afterAlNavSections.flatMap((s) => s.items);

export const afterAlBottomNavItems: NavItem[] = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Logout', path: '/login', icon: LogOut },
];

// ==========================================
// 3. AFTER O/L STUDENT PORTAL NAVIGATION
// ==========================================
export const afterOlNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'O/L Overview', path: '/after-ol/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'My O/L Journey',
    items: [
      { name: 'A/L Stream Finder', path: '/after-ol/streams', icon: Compass, badge: 'New' },
      { name: 'Subject Combinations', path: '/after-ol/subjects', icon: BookOpen },
      { name: 'Requirements Checker', path: '/after-ol/eligibility', icon: ClipboardCheck },
      { name: 'Career Pathways', path: '/after-ol/careers', icon: Briefcase },
    ],
  },
  {
    title: 'Assistant',
    items: [
      { name: 'PathWise AI', path: '/after-ol/ai', icon: Sparkles },
    ],
  },
];

export const afterOlNavItems: NavItem[] = afterOlNavSections.flatMap((s) => s.items);

export const afterOlBottomNavItems: NavItem[] = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Logout', path: '/login', icon: LogOut },
];
