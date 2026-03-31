import { NavLink } from 'react-router-dom';
import { filterNavigationSections } from '../authz';
import { navigationSections } from '../navigation';
import './Sidebar.css';

type SidebarProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

export default function Sidebar({ collapsed, onToggleSidebar }: SidebarProps) {
  const visibleSections = filterNavigationSections(navigationSections);

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <img className="sidebar-logo" src="/logovis.png" alt="VIS" />
        <button className="sidebar-toggle" type="button" onClick={onToggleSidebar} aria-label="Alternar menu lateral">
          <span className="material-icons-round">
            {collapsed ? 'menu_open' : 'menu'}
          </span>
        </button>
      </div>

      <nav className="nav-menu">
        {visibleSections.map((section) => (
          <div className="nav-section" key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              >
                <span className="material-icons-round">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-link">Soporte</div>
        <div className="footer-version">Version 1.0</div>
      </div>
    </aside>
  );
}

