import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './AdminLayout.css';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((prev) => !prev)}
      />
      <div className="admin-main">
        <Topbar />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
