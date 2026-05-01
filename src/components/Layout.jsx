import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import { ROLE_LABELS } from '../theme.js'
import logoUrl from '@assets/isologo-ucp.png'

const NAV_ITEMS = [
  { path: '/',              label: 'Inicio',        icon: IconDashboard,  roles: null },
  { path: '/users',         label: 'Usuarios',      icon: IconUsers,      roles: ['administrador'] },
  { path: '/assets',        label: 'Activos',       icon: IconInventory,  roles: null },
  { path: '/reports',       label: 'Reportes',      icon: IconReports,    roles: ['administrador', 'auditor', 'direccionAdminFin', 'responsableArea'] },
  { path: '/notifications', label: 'Avisos',        icon: IconBell,       roles: null },
]

export default function Layout({ children, title }) {
  const { currentUser, logout, hasRole } = useAuth()
  const { unreadCount } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Cerrar sidebar en mobile al navegar
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => hasRole(r)),
  )

  const roleLabel = (currentUser?.roles || [])
    .map((r) => ROLE_LABELS[r] || r)
    .join(' · ')

  return (
    <div className="app-shell">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            zIndex: 99, display: 'none',
          }}
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src={logoUrl} alt="UCP" onError={(e) => { e.target.style.display = 'none' }} />
          <span className="sidebar-brand-text">Inventario<br />Institucional</span>
        </div>

        <div className="sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                {item.label}
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="sidebar-footer">
          <div className="user-card" style={{ marginBottom: 8 }}>
            <div className="user-card-name truncate">{currentUser?.fullName}</div>
            <div className="user-card-role truncate">{roleLabel}</div>
            {currentUser?.area && (
              <div className="user-card-role truncate" style={{ marginTop: 2 }}>
                {currentUser.area}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost w-full btn-sm"
            onClick={() => navigate('/settings')}
            style={{ marginBottom: 6 }}
          >
            <IconSettings size={15} /> Mi cuenta
          </button>
          <button
            className="btn btn-outlined w-full btn-sm"
            onClick={logout}
            style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
          >
            <IconLogout size={15} /> Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="btn btn-ghost btn-icon"
            style={{ display: 'none' }}
            id="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <IconMenu size={20} />
          </button>
          <span className="topbar-title">{title}</span>
        </header>
        <main className="page-body">{children}</main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-toggle { display: flex !important; }
          .mobile-overlay { display: block !important; }
        }
      `}</style>
    </div>
  )
}

// ── SVG Icon helpers ──────────────────────────────────────────────────────────
function Svg({ size = 20, children, ...props }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}
export function IconDashboard({ size }) {
  return <Svg size={size}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Svg>
}
export function IconUsers({ size }) {
  return <Svg size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>
}
export function IconInventory({ size }) {
  return <Svg size={size}><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Svg>
}
export function IconReports({ size }) {
  return <Svg size={size}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>
}
export function IconBell({ size }) {
  return <Svg size={size}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>
}
export function IconSettings({ size }) {
  return <Svg size={size}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>
}
export function IconLogout({ size }) {
  return <Svg size={size}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>
}
export function IconMenu({ size }) {
  return <Svg size={size}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Svg>
}
export function IconPlus({ size }) {
  return <Svg size={size}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>
}
export function IconEdit({ size }) {
  return <Svg size={size}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>
}
export function IconTrash({ size }) {
  return <Svg size={size}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></Svg>
}
export function IconEye({ size }) {
  return <Svg size={size}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Svg>
}
export function IconSearch({ size }) {
  return <Svg size={size}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>
}
export function IconDownload({ size }) {
  return <Svg size={size}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>
}
export function IconFilter({ size }) {
  return <Svg size={size}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Svg>
}
export function IconRefresh({ size }) {
  return <Svg size={size}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Svg>
}
export function IconKey({ size }) {
  return <Svg size={size}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></Svg>
}
export function IconCheck({ size }) {
  return <Svg size={size}><polyline points="20 6 9 17 4 12"/></Svg>
}
export function IconX({ size }) {
  return <Svg size={size}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>
}
export function IconInfo({ size }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Svg>
}
export function IconAlert({ size }) {
  return <Svg size={size}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>
}
export function IconHistory({ size }) {
  return <Svg size={size}><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5-4v4h4"/></Svg>
}
export function IconPhoto({ size }) {
  return <Svg size={size}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Svg>
}
export function IconLock({ size }) {
  return <Svg size={size}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>
}
export function IconUser({ size }) {
  return <Svg size={size}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Svg>
}
export function IconMail({ size }) {
  return <Svg size={size}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Svg>
}
