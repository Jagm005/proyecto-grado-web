import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useApp } from '../context/AppContext.jsx'
import {
  ROLE_LABELS,
  STATE_LABELS,
  STATE_BADGE,
  formatCurrency,
  formatDateTime,
  depreciationValue,
} from '../theme.js'
import {
  IconInventory,
  IconUsers,
  IconAlert,
  IconRefresh,
} from '../components/Layout.jsx'

export default function DashboardPage() {
  const { currentUser, hasRole } = useAuth()
  const { assets, users, loading, error, loadData, auditFindings } = useApp()
  const navigate = useNavigate()

  const findings = auditFindings()

  // Distribución por estado
  const byState = {}
  for (const a of assets) {
    byState[a.state] = (byState[a.state] || 0) + 1
  }

  // Valor total del inventario
  const totalValue = assets.reduce((sum, a) => sum + (a.acquisitionValue || 0), 0)
  const totalDepreciated = assets.reduce(
    (sum, a) => sum + depreciationValue(a),
    0,
  )

  return (
    <Layout title="Panel de Control">
      {/* Encabezado */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 20 }}
      >
        <div>
          <h2>Bienvenido, {currentUser?.fullName?.split(' ')[0]}</h2>
          <p className="text-sm text-muted" style={{ marginTop: 2 }}>
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <button className="btn btn-outlined btn-sm" onClick={loadData} disabled={loading}>
          <IconRefresh size={15} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <IconAlert size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de métricas */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <MetricCard
          icon={<IconInventory size={22} />}
          color="#00804E"
          title="Total Activos"
          value={assets.length}
          sub={`Valor: ${formatCurrency(totalValue)}`}
          onClick={() => navigate('/assets')}
        />
        {hasRole('administrador') && (
          <MetricCard
            icon={<IconUsers size={22} />}
            color="#1565C0"
            title="Usuarios Registrados"
            value={users.length}
            sub={`${users.filter((u) => u.isActive).length} activos`}
            onClick={() => navigate('/users')}
          />
        )}
        <MetricCard
          icon={<span style={{ fontSize: 22 }}>📦</span>}
          color="#2E7D32"
          title="Valor Depreciado"
          value={formatCurrency(totalDepreciated)}
          sub="Valor actual estimado"
        />
        <MetricCard
          icon={<IconAlert size={22} />}
          color={findings.notFound.length > 0 ? '#D32F2F' : '#2E7D32'}
          title="No Encontrados"
          value={findings.notFound.length}
          sub={findings.notFound.length > 0 ? 'Requieren atención' : 'Sin activos faltantes'}
          onClick={() => navigate('/assets')}
        />
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        {/* Distribución por estado */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Activos por Estado</h3>
          {Object.keys(STATE_LABELS).map((state) => {
            const count = byState[state] || 0
            const pct = assets.length ? Math.round((count / assets.length) * 100) : 0
            return (
              <div key={state} style={{ marginBottom: 10 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span className={`badge ${STATE_BADGE[state]}`}>
                    {STATE_LABELS[state]}
                  </span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: '#F0F7F4',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'var(--primary)',
                      borderRadius: 3,
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Información de sesión */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Sesión Actual</h3>
          <InfoRow label="Usuario" value={currentUser?.username} />
          <InfoRow label="Nombre" value={currentUser?.fullName} />
          <InfoRow label="Correo" value={currentUser?.email} />
          <InfoRow
            label="Rol(es)"
            value={(currentUser?.roles || []).map((r) => ROLE_LABELS[r] || r).join(', ')}
          />
          <InfoRow label="Área" value={currentUser?.area || '—'} />

          {/* Hallazgos rápidos */}
          {(findings.notFound.length > 0 ||
            findings.duplicated.length > 0 ||
            findings.withoutResponsible.length > 0) && (
            <>
              <div className="divider" style={{ margin: '12px 0' }} />
              <h4 style={{ marginBottom: 10, color: 'var(--warning)' }}>
                ⚠ Alertas de Inventario
              </h4>
              {findings.notFound.length > 0 && (
                <div className="alert alert-error" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  {findings.notFound.length} activo(s) marcado(s) como No Encontrado
                </div>
              )}
              {findings.duplicated.length > 0 && (
                <div className="alert alert-warning" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  {findings.duplicated.length} código(s) duplicado(s)
                </div>
              )}
              {findings.withoutResponsible.length > 0 && (
                <div className="alert alert-info" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  {findings.withoutResponsible.length} activo(s) sin responsable
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

function MetricCard({ icon, color, title, value, sub, onClick }) {
  return (
    <div
      className="card flex items-center gap-3"
      style={{ cursor: onClick ? 'pointer' : 'default', padding: '1rem 1.25rem' }}
      onClick={onClick}
    >
      <div
        style={{
          background: `${color}20`,
          borderRadius: 10,
          padding: 10,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="text-sm text-muted">{title}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold" style={{ textAlign: 'right', maxWidth: '60%' }}>
        {value || '—'}
      </span>
    </div>
  )
}
