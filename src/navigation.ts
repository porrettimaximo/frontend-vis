import { matchPath } from 'react-router-dom';

export type NavigationItem = {
  label: string;
  path: string;
  icon: string;
  roles?: ('SYSTEM_ADMIN' | 'ADMIN' | 'RECEPCIONISTA' | 'ENTRENADOR')[];
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

type RouteMeta = {
  path: string;
  title: string;
  parent?: string;
};

export const navigationSections: NavigationSection[] = [
  {
    label: 'Sistema VIS',
    items: [
      {
        label: 'Tenants y Control',
        path: '/admin/system-console',
        icon: 'hub',
        roles: ['SYSTEM_ADMIN']
      }
    ]
  },
  {
    label: 'Resumen',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard', roles: ['ADMIN'] },
      { label: 'Mi Panel', path: '/admin/staff-dashboard', icon: 'support_agent', roles: ['RECEPCIONISTA', 'ENTRENADOR'] }
    ]
  },
  {
    label: 'Operacion',
    items: [
      { label: 'Socios', path: '/admin/members', icon: 'group', roles: ['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR'] },
      { label: 'Planes', path: '/admin/plans', icon: 'card_membership', roles: ['ADMIN'] },
      { label: 'Pagos', path: '/admin/payments', icon: 'payments', roles: ['ADMIN', 'RECEPCIONISTA'] },
      {
        label: 'Caja',
        path: '/admin/cash-register',
        icon: 'point_of_sale',
        roles: ['ADMIN', 'RECEPCIONISTA']
      },
      { label: 'Accesos', path: '/admin/access-control', icon: 'verified_user', roles: ['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR'] },
      { label: 'Registro', path: '/admin/access-audit', icon: 'history', roles: ['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR'] },
      { label: 'Rutinas', path: '/admin/workouts', icon: 'fitness_center', roles: ['ADMIN', 'ENTRENADOR'] }
    ]
  },
  {
    label: 'Administracion',
    items: [
      {
        label: 'Staff y Roles',
        path: '/admin/staff-management',
        icon: 'admin_panel_settings',
        roles: ['ADMIN']
      },
      { label: 'Reportes', path: '/admin/reports', icon: 'insights', roles: ['ADMIN'] },
      { label: 'Configuracion', path: '/admin/settings', icon: 'settings', roles: ['ADMIN'] }
    ]
  }
];

const routeMeta: RouteMeta[] = [
  { path: '/admin/system-console', title: 'Consola Sistema', parent: 'Sistema VIS' },
  { path: '/admin/dashboard', title: 'Dashboard', parent: 'Inicio' },
  { path: '/admin/staff-dashboard', title: 'Panel Staff', parent: 'Inicio' },
  { path: '/admin/members', title: 'Socios', parent: 'Operacion' },
  { path: '/admin/members/new', title: 'Nuevo Socio', parent: 'Socios' },
  { path: '/admin/members/:id', title: 'Detalle de Socio', parent: 'Socios' },
  { path: '/admin/members/:id/medical', title: 'Perfil Medico', parent: 'Socios' },
  { path: '/admin/plans', title: 'Planes y Membresias', parent: 'Operacion' },
  { path: '/admin/payments', title: 'Pagos y Cobros', parent: 'Operacion' },
  { path: '/admin/cash-register', title: 'Caja Diaria', parent: 'Operacion' },
  { path: '/admin/access-control', title: 'Control de Accesos', parent: 'Operacion' },
  { path: '/admin/access-audit', title: 'Registro de Accesos', parent: 'Operacion' },
  { path: '/admin/reports', title: 'Reportes', parent: 'Administracion' },
  { path: '/admin/workouts', title: 'Rutinas', parent: 'Operacion' },
  { path: '/admin/staff-management', title: 'Staff y Roles', parent: 'Administracion' },
  { path: '/admin/settings', title: 'Configuracion', parent: 'Administracion' }
];

export function getBreadcrumbs(pathname: string): string[] {
  const match = routeMeta.find((route) => matchPath({ path: route.path, end: true }, pathname));
  if (!match) {
    return ['Inicio', 'Panel'];
  }
  return match.parent ? ['Inicio', match.parent, match.title] : ['Inicio', match.title];
}
