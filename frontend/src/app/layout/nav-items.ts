export interface NavEntry {
  group?: string;
  route?: string;
  icon?: string;
  label?: string;
  badge?: string;
  permissions?: string[];
  /** Roles that never see this item even though they hold the required permission — e.g.
   *  subscribers share 'content:read' with creator/editorial/rightsManager but have no use
   *  for the catalog-management or review-workflow pages that permission also unlocks. */
  hideForRoles?: string[];
}

/** Mirrors demo.html's NAV_ITEMS exactly (icons/labels/order), with each item's required
 *  permission derived from the backend's @PreAuthorize authority strings so the sidebar only
 *  ever shows what the user is actually allowed to open. */
export const NAV_ITEMS: NavEntry[] = [
  { group: 'Overview' },
  { route: '/dashboard', icon: '▚', label: 'Dashboard' },
  { group: 'Content' },
  { route: '/content', icon: '🎞', label: 'Content Catalog', permissions: ['content:read'] },
  { route: '/creators', icon: '👤', label: 'Creators', permissions: ['content:read'], hideForRoles: ['subscriber'] },
  { route: '/content/tags', icon: '🏷', label: 'Tag Management', permissions: ['content:read'], hideForRoles: ['subscriber'] },
  { route: '/editorial/reviews', icon: '✎', label: 'Editorial', permissions: ['content:read'], hideForRoles: ['subscriber'] },
  { route: '/editorial/collections', icon: '▦', label: 'Collections', permissions: ['content:read'], hideForRoles: ['subscriber'] },
  { route: '/editorial/schedule', icon: '🗓', label: 'Publication Calendar', permissions: ['content:read'], hideForRoles: ['subscriber'] },
  { route: '/licensing', icon: '⚖', label: 'Licensing', permissions: ['license:manage'] },
  { group: 'Commerce' },
  { route: '/subscription/plans', icon: '◈', label: 'Subscriptions', permissions: ['plan:configure'] },
  { route: '/subscription/subscriptions', icon: '⊞', label: 'User Subscriptions', permissions: ['subscription:view', 'subscription:manage'], hideForRoles: ['subscriber'] },
  { route: '/subscription/history', icon: '▤', label: 'Subscription History', permissions: ['plan:configure'] },
  { route: '/royalty', icon: '$', label: 'Royalty', permissions: ['royalty:view'] },
  { group: 'Subscriber Portal' },
  { route: '/subscription/catalog', icon: '◈', label: 'Plan Catalog', permissions: ['plan:view'], hideForRoles: ['rightsManager', 'creator', 'admin', 'editorial', 'revenueAnalyst'] },
  { route: '/subscription/my', icon: '⊞', label: 'Current Subscription', permissions: ['subscription:view'], hideForRoles: ['rightsManager', 'creator', 'admin', 'editorial', 'revenueAnalyst'] },
  { group: 'Platform' },
  { route: '/analytics', icon: '◔', label: 'Analytics & Reports', permissions: ['report:view'] },
  { route: '/iam/users', icon: '⛨', label: 'IAM & Users', permissions: ['user:manage', 'role:manage', 'permission:manage'] },
  { route: '/audit', icon: '▤', label: 'Audit & Compliance', permissions: ['audit:read'] }
];
