import type { NavigationSection } from './navigation';

export type AppRole = 'SYSTEM_ADMIN' | 'ADMIN' | 'RECEPCIONISTA' | 'ENTRENADOR' | 'STAFF';

export function getCurrentRole(): AppRole {
  const role = sessionStorage.getItem('vis_auth_role');
  if (role === 'SYSTEM_ADMIN' || role === 'ADMIN' || role === 'RECEPCIONISTA' || role === 'ENTRENADOR') {
    return role;
  }
  return 'STAFF';
}

export function getDefaultAdminRoute(role: AppRole = getCurrentRole()): string {
  if (role === 'SYSTEM_ADMIN') return '/admin/system-console';
  if (role === 'ADMIN') return '/admin/dashboard';
  return '/admin/staff-dashboard';
}

export function hasRequiredRole(allowedRoles?: AppRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  return allowedRoles.includes(getCurrentRole());
}

export function filterNavigationSections(sections: NavigationSection[]): NavigationSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasRequiredRole(item.roles))
    }))
    .filter((section) => section.items.length > 0);
}
