import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { apiLogin, apiGoogleLogin } from '../api.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('inventario_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Persiste sesión en localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('inventario_user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('inventario_user')
    }
  }, [currentUser])

  // ── login con credenciales ──────────────────────────────────────────────────
  // Retorna null si exitoso; string con prefijo LOCK:secs | WARN:rest | INFO:msg
  const login = useCallback(async (identifier, password) => {
    try {
      const res = await apiLogin(identifier.trim(), password)
      setCurrentUser(res.data)
      return null
    } catch (err) {
      const body = err.response?.data
      if (!body) return 'INFO:No se pudo conectar al servidor. Verifique la red.'
      const code = body.code ?? 'INFO'
      const message =
        body.message ?? body.error ?? 'Error desconocido del servidor'
      const seconds = body.seconds ?? 900
      const remaining = body.remaining ?? 0
      if (code === 'LOCK') return `LOCK:${seconds}`
      if (code === 'WARN') return `WARN:${remaining}`
      return `INFO:${message}`
    }
  }, [])

  // ── login con Google (popup) ────────────────────────────────────────────────
  const [googleResolve, setGoogleResolve] = useState(null)

  const googleLoginHook = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!googleResolve) return
      try {
        // Obtener datos del perfil con el access token
        const profileRes = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } },
        )
        const profile = await profileRes.json()
        const email = profile.email
        if (!email) {
          googleResolve('INFO:No se pudo obtener el correo de Google.')
          return
        }
        const res = await apiGoogleLogin(email)
        setCurrentUser(res.data)
        googleResolve(null)
      } catch (err) {
        const body = err.response?.data
        const message = body?.message ?? body?.error ?? 'Error al iniciar sesión con Google.'
        googleResolve(`INFO:${message}`)
      } finally {
        setGoogleResolve(null)
      }
    },
    onError: () => {
      googleResolve?.('INFO:Inicio de sesión con Google cancelado.')
      setGoogleResolve(null)
    },
  })

  const loginWithGoogle = useCallback(() => {
    return new Promise((resolve) => {
      setGoogleResolve(() => resolve)
      googleLoginHook()
    })
  }, [googleLoginHook])

  const logout = useCallback(() => setCurrentUser(null), [])

  const hasRole = useCallback(
    (role) => currentUser?.roles?.includes(role) ?? false,
    [currentUser],
  )

  const canManageUsers = useCallback(
    () => hasRole('administrador'),
    [hasRole],
  )

  const canManageAssets = useCallback(
    () => hasRole('administrador') || hasRole('auxiliarInventario'),
    [hasRole],
  )

  return (
    <AuthCtx.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        loginWithGoogle,
        logout,
        hasRole,
        canManageUsers,
        canManageAssets,
      }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
