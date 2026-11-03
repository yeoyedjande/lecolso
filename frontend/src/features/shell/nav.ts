import {
  Baby,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  School,
  Settings,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

import { can, type Membership } from '@/features/auth/access'

/**
 * Menus des espaces. `path` : segment sous l'espace ('' = accueil). `permission` : permission exigée
 * (renvoyée par /me) ; sans permission, l'entrée est masquée (le backend reste la vraie barrière).
 */
export type NavKey =
  | 'dashboard'
  | 'students'
  | 'enrollment'
  | 'import'
  | 'classes'
  | 'payments'
  | 'unpaid'
  | 'cashDesk'
  | 'fees'
  | 'grades'
  | 'skills'
  | 'reportCards'
  | 'attendance'
  | 'daycare'
  | 'messages'
  | 'calendar'
  | 'settings'
  | 'home'
  | 'myClasses'
  | 'rollCall'
  | 'children'
  | 'payMobile'
  | 'profile'

export interface NavItem {
  key: NavKey
  path: string
  icon: LucideIcon
  permission?: string
}

export type NavSectionKey = 'pilotage' | 'schooling' | 'finance' | 'pedagogy' | 'daily' | 'admin'

export interface NavSection {
  key: NavSectionKey
  items: NavItem[]
}

export const BACK_OFFICE_NAV: NavSection[] = [
  { key: 'pilotage', items: [{ key: 'dashboard', path: '', icon: LayoutDashboard }] },
  {
    key: 'schooling',
    items: [
      { key: 'students', path: 'eleves', icon: Users, permission: 'students.view' },
      { key: 'enrollment', path: 'inscriptions', icon: UserPlus, permission: 'students.manage' },
      { key: 'import', path: 'import', icon: FileSpreadsheet, permission: 'students.manage' },
      { key: 'classes', path: 'classes', icon: School, permission: 'school.settings.view' },
    ],
  },
  {
    key: 'finance',
    items: [
      { key: 'payments', path: 'encaissements', icon: Wallet, permission: 'billing.manage' },
      { key: 'unpaid', path: 'impayes', icon: Receipt, permission: 'billing.view' },
      { key: 'cashDesk', path: 'caisse', icon: WalletCards, permission: 'billing.manage' },
      { key: 'fees', path: 'frais', icon: FileText, permission: 'billing.view' },
    ],
  },
  {
    key: 'pedagogy',
    items: [
      { key: 'grades', path: 'notes', icon: GraduationCap, permission: 'grades.view' },
      { key: 'skills', path: 'competences', icon: Sparkles, permission: 'grades.view' },
      { key: 'reportCards', path: 'bulletins', icon: BookOpenCheck, permission: 'grades.view' },
    ],
  },
  {
    key: 'daily',
    items: [
      { key: 'attendance', path: 'presences', icon: ClipboardCheck, permission: 'attendance.view' },
      { key: 'daycare', path: 'garderie', icon: Baby, permission: 'attendance.view' },
      { key: 'messages', path: 'messages', icon: MessageCircle, permission: 'messaging.send' },
      { key: 'calendar', path: 'calendrier', icon: CalendarDays },
    ],
  },
  {
    key: 'admin',
    items: [
      { key: 'settings', path: 'parametres', icon: Settings, permission: 'school.settings.view' },
    ],
  },
]

export const TEACHER_TABS: NavItem[] = [
  { key: 'myClasses', path: '', icon: School },
  { key: 'rollCall', path: 'appel', icon: ClipboardCheck },
  { key: 'grades', path: 'notes', icon: GraduationCap },
  { key: 'messages', path: 'messages', icon: MessageCircle },
  { key: 'profile', path: 'profil', icon: UserRound },
]

export const PARENT_TABS: NavItem[] = [
  { key: 'home', path: '', icon: Home },
  { key: 'payMobile', path: 'paiements', icon: Wallet },
  { key: 'messages', path: 'messages', icon: MessageCircle },
  { key: 'profile', path: 'profil', icon: UserRound },
]

/** Sections du menu réduites aux entrées permises ; une section vide disparaît. */
export function visibleSections(
  sections: NavSection[],
  membership: Membership | null,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.permission === undefined || can(membership, item.permission),
      ),
    }))
    .filter((section) => section.items.length > 0)
}
