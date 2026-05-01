import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import {
  apiGetAssets,
  apiGetUsers,
  apiCreateAsset,
  apiUpdateAsset,
  apiDeleteAsset,
  apiAddHistory,
  apiCreateUser,
  apiUpdateUser,
  apiUpdatePassword,
  apiDeleteUser,
} from '../api.js'
import { useAuth } from './AuthContext.jsx'

const AppCtx = createContext(null)

// Notificaciones almacenadas en localStorage (sincronización web-side)
const NOTIF_KEY = 'inventario_notifications'

function loadNotifs() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]')
  } catch {
    return []
  }
}

function saveNotifs(notifs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs))
}

export function AppProvider({ children }) {
  const { currentUser } = useAuth()

  const [assets, setAssets]             = useState([])
  const [users, setUsers]               = useState([])
  const [notifications, setNotifications] = useState(loadNotifs)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  // Persist notifications
  useEffect(() => { saveNotifs(notifications) }, [notifications])

  // ── Carga inicial de datos ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    setError(null)
    try {
      const [assetRes, userRes] = await Promise.all([
        apiGetAssets(),
        apiGetUsers(),
      ])
      setAssets(assetRes.data)
      setUsers(userRes.data)
    } catch (e) {
      setError('No se pudo cargar los datos del servidor.')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => { loadData() }, [loadData])

  // ── Notificaciones ────────────────────────────────────────────────────────
  const notifVisibleToUser = useCallback(
    (n) => {
      if (!currentUser) return false
      if (n.fromUser === currentUser.username) return true
      if (n.toRoles?.length > 0) {
        return currentUser.roles?.some((r) => n.toRoles.includes(r))
      }
      return currentUser.roles?.includes('administrador') ?? false
    },
    [currentUser],
  )

  const myNotifications = notifications
    .filter(notifVisibleToUser)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const unreadCount = myNotifications.filter((n) => !n.read).length

  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [...prev, notif])
  }, [])

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const approveNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: 'aprobada', read: true } : n,
      ),
    )
  }, [])

  const denyNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: 'denegada', read: true } : n,
      ),
    )
  }, [])

  const reportMissingAsset = useCallback(
    (scannedCode, notes) => {
      const notif = {
        id: `NOTIF-${Date.now()}`,
        type: 'missing_asset',
        title: `Activo no encontrado: ${scannedCode}`,
        body: `El usuario ${currentUser?.fullName || currentUser?.username} reportó que el activo con código "${scannedCode}" no existe físicamente.${notes ? `\nNota: ${notes}` : ''}`,
        createdAt: new Date().toISOString(),
        fromUser: currentUser?.username || '',
        relatedId: scannedCode,
        toRoles: ['administrador', 'direccionAdminFin'],
        status: 'pendiente',
        read: false,
      }
      addNotification(notif)
    },
    [currentUser, addNotification],
  )

  const requestCredentialReset = useCallback(
    (username) => {
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase(),
      )
      if (!user) return false
      const already = notifications.some(
        (n) =>
          n.type === 'password_reset_request' &&
          n.relatedId === user.username &&
          n.status === 'pendiente',
      )
      if (already) return true
      addNotification({
        id: `NOTIF-${Date.now()}`,
        type: 'password_reset_request',
        title: 'Solicitud de restablecimiento de contraseña',
        body: `${user.fullName} (${user.username}) ha olvidado su contraseña y solicita que el administrador la restablezca.`,
        createdAt: new Date().toISOString(),
        fromUser: user.username,
        relatedId: user.username,
        toRoles: ['administrador'],
        status: 'pendiente',
        read: false,
      })
      return true
    },
    [users, notifications, addNotification],
  )

  // ── Assets CRUD ───────────────────────────────────────────────────────────
  const createAsset = useCallback(
    async (data) => {
      const res = await apiCreateAsset(data)
      // Registrar evento de creación
      await apiAddHistory(data.code, {
        action: 'CREACION',
        detail: 'Activo registrado desde web',
        performedBy: currentUser?.username || 'web',
      }).catch(() => {})
      setAssets((prev) => [...prev, res.data])
      return res.data
    },
    [currentUser],
  )

  const updateAsset = useCallback(
    async (code, data, performedBy) => {
      const res = await apiUpdateAsset(code, data)
      await apiAddHistory(code, {
        action: 'ACTUALIZACION',
        detail: Object.keys(data).join(', ') + ' actualizados',
        performedBy: performedBy || currentUser?.username || 'web',
      }).catch(() => {})
      setAssets((prev) => prev.map((a) => (a.code === code ? res.data : a)))
      return res.data
    },
    [currentUser],
  )

  const deleteAsset = useCallback(async (code) => {
    await apiDeleteAsset(code)
    setAssets((prev) => prev.filter((a) => a.code !== code))
  }, [])

  // ── Users CRUD ────────────────────────────────────────────────────────────
  const createUser = useCallback(async (data) => {
    const res = await apiCreateUser(data)
    setUsers((prev) => [...prev, res.data])
    return res.data
  }, [])

  const updateUser = useCallback(async (id, data) => {
    const res = await apiUpdateUser(id, data)
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...res.data } : u)))
    return res.data
  }, [])

  const resetPassword = useCallback(
    async (user) => {
      const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
      const pwd = Array.from(crypto.getRandomValues(new Uint8Array(10)))
        .map((b) => chars[b % chars.length])
        .join('')
      await apiUpdatePassword(user.id, pwd)
      // Marcar solicitudes pendientes como aprobadas
      setNotifications((prev) =>
        prev.map((n) =>
          n.type === 'password_reset_request' &&
          n.relatedId === user.username &&
          n.status === 'pendiente'
            ? { ...n, status: 'aprobada', read: true }
            : n,
        ),
      )
      return pwd
    },
    [],
  )

  const deleteUser = useCallback(async (id) => {
    await apiDeleteUser(id)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }, [])

  // ── Auditoría ─────────────────────────────────────────────────────────────
  const auditFindings = useCallback(() => {
    const seen = new Set()
    const duplicated = []
    for (const a of assets) {
      if (seen.has(a.code)) duplicated.push(a.code)
      seen.add(a.code)
    }
    return {
      notFound: assets
        .filter((a) => a.state === 'noEncontrado')
        .map((a) => a.code),
      duplicated,
      withoutResponsible: assets
        .filter((a) => !a.responsible?.trim())
        .map((a) => a.code),
    }
  }, [assets])

  return (
    <AppCtx.Provider
      value={{
        assets,
        users,
        notifications,
        myNotifications,
        unreadCount,
        loading,
        error,
        loadData,
        // assets
        createAsset,
        updateAsset,
        deleteAsset,
        // users
        createUser,
        updateUser,
        resetPassword,
        deleteUser,
        // notifications
        markRead,
        markAllRead,
        approveNotification,
        denyNotification,
        reportMissingAsset,
        requestCredentialReset,
        // reports
        auditFindings,
      }}
    >
      {children}
    </AppCtx.Provider>
  )
}

export const useApp = () => useContext(AppCtx)
