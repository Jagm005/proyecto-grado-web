import Layout from '../components/Layout.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { formatDateTime } from '../theme.js'
import {
  IconBell,
  IconCheck,
  IconX,
  IconAlert,
} from '../components/Layout.jsx'

const TYPE_LABELS = {
  missing_asset:            'Activo No Encontrado',
  password_reset_request:   'Solicitud de Contraseña',
  info:                     'Información',
}

const STATUS_BADGE = {
  pendiente:  'badge-yellow',
  aprobada:   'badge-green',
  denegada:   'badge-red',
}

const STATUS_LABELS = {
  pendiente:  'Pendiente',
  aprobada:   'Aprobada',
  denegada:   'Denegada',
}

export default function NotificationsPage() {
  const { myNotifications, unreadCount, markRead, markAllRead, approveNotification, denyNotification } = useApp()
  const { currentUser, hasRole } = useAuth()
  const toast = useToast()
  const isAdmin = hasRole('administrador')

  function handleMarkRead(id) {
    markRead(id)
  }

  function handleApprove(id) {
    approveNotification(id)
    toast.success('Notificación aprobada.')
  }

  function handleDeny(id) {
    denyNotification(id)
    toast.info('Notificación denegada.')
  }

  return (
    <Layout title="Avisos y Notificaciones">
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h2>Notificaciones</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted" style={{ marginTop: 2 }}>
              {unreadCount} sin leer
            </p>
          )}
        </div>
        {myNotifications.length > 0 && (
          <button className="btn btn-outlined btn-sm" onClick={markAllRead}>
            <IconCheck size={14} /> Marcar todas leídas
          </button>
        )}
      </div>

      {myNotifications.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}
        >
          <IconBell size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <p>No hay notificaciones.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myNotifications.map((n) => (
            <NotifCard
              key={n.id}
              notif={n}
              isAdmin={isAdmin}
              currentUsername={currentUser?.username}
              onRead={handleMarkRead}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          ))}
        </div>
      )}
    </Layout>
  )
}

function NotifCard({ notif, isAdmin, currentUsername, onRead, onApprove, onDeny }) {
  const unread = !notif.read
  const isMine = notif.fromUser === currentUsername
  const canAct = isAdmin && notif.status === 'pendiente' && !isMine

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${unread ? 'var(--primary)' : 'var(--border)'}`,
        padding: '14px 16px',
        background: unread ? 'var(--primary-light)' : 'var(--surface)',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            {TYPE_LABELS[notif.type] || notif.type}
          </span>
          <span className={`badge ${STATUS_BADGE[notif.status] || 'badge-gray'}`}>
            {STATUS_LABELS[notif.status] || notif.status}
          </span>
          {unread && (
            <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
              ● Nuevo
            </span>
          )}
        </div>
        <span className="text-xs text-muted">{formatDateTime(notif.createdAt)}</span>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 4 }}>{notif.title}</div>
      <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-line' }}>{notif.body}</p>
      <p className="text-xs text-muted" style={{ marginTop: 6 }}>
        De: {notif.fromUser}
      </p>

      <div className="flex gap-2" style={{ marginTop: 10 }}>
        {unread && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onRead(notif.id)}
            style={{ fontSize: '0.78rem' }}
          >
            <IconCheck size={13} /> Marcar leída
          </button>
        )}
        {canAct && (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onApprove(notif.id)}
            >
              <IconCheck size={13} /> Aprobar
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onDeny(notif.id)}
            >
              <IconX size={13} /> Denegar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
