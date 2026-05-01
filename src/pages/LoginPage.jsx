import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import logoUrl from '@assets/logo-ucp.png'

const DEMO_USERS = [
  { username: 'admin',    password: 'admin123', label: 'Administrador' },
  { username: 'auxiliar', password: 'aux123',   label: 'Auxiliar Inv.' },
  { username: 'auditor',  password: 'audit123', label: 'Auditor' },
  { username: 'daf',      password: 'daf123',   label: 'Dir. Adm. Fin.' },
  { username: 'resp',     password: 'resp123',  label: 'Resp. Área' },
]

export default function LoginPage() {
  const { login, loginWithGoogle, requestCredentialReset } = useAuth()
  const toast = useToast()

  const [identifier, setIdentifier] = useState('admin')
  const [password, setPassword]     = useState('admin123')
  const [loading, setLoading]       = useState(false)
  const [authError, setAuthError]   = useState(null)   // { type, message, remaining }
  const [lockSecs, setLockSecs]     = useState(0)
  const timerRef = useRef(null)

  // Forgot password dialog
  const [forgotOpen, setForgotOpen]   = useState(false)
  const [forgotUser, setForgotUser]   = useState('')
  const [forgotMsg, setForgotMsg]     = useState(null)

  // Countdown for lock
  useEffect(() => {
    if (authError?.type !== 'LOCK') return
    timerRef.current = setInterval(() => {
      setLockSecs((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          setAuthError(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [authError?.type])

  const isLocked = authError?.type === 'LOCK' || loading

  async function handleLogin(e) {
    e.preventDefault()
    if (isLocked) return
    clearInterval(timerRef.current)
    setLoading(true)
    setAuthError(null)

    const raw = await login(identifier, password)
    setLoading(false)

    if (!raw) return  // success → AuthProvider updates currentUser → App redirects

    const sep     = raw.indexOf(':')
    const prefix  = sep === -1 ? raw : raw.slice(0, sep)
    const payload = sep === -1 ? '' : raw.slice(sep + 1)

    if (prefix === 'LOCK') {
      const secs = parseInt(payload) || 900
      setLockSecs(secs)
      setAuthError({ type: 'LOCK', message: '' })
    } else if (prefix === 'WARN') {
      setAuthError({ type: 'WARN', remaining: parseInt(payload) || 0 })
    } else {
      setAuthError({ type: 'INFO', message: payload || prefix })
    }
  }

  async function handleGoogleLogin() {
    if (isLocked) return
    setLoading(true)
    const raw = await loginWithGoogle()
    setLoading(false)
    if (!raw) return
    const sep = raw.indexOf(':')
    const msg = sep === -1 ? raw : raw.slice(sep + 1)
    setAuthError({ type: 'INFO', message: msg })
  }

  function prefill(u) {
    setIdentifier(u.username)
    setPassword(u.password)
    setAuthError(null)
  }

  function formatLock() {
    const m = Math.floor(lockSecs / 60).toString().padStart(2, '0')
    const s = (lockSecs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function handleForgot(e) {
    e.preventDefault()
    if (!forgotUser.trim()) { setForgotMsg({ type: 'error', text: 'Ingresa tu usuario.' }); return }
    const ok = requestCredentialReset(forgotUser.trim())
    if (ok) {
      setForgotMsg({ type: 'success', text: 'Solicitud enviada. El administrador recibirá una notificación.' })
    } else {
      setForgotMsg({ type: 'error', text: 'Usuario no encontrado.' })
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src={logoUrl}
            alt="Universidad Cooperativa de Colombia"
            style={{ maxWidth: 180, maxHeight: 80, objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <h2 style={{ marginTop: 12, color: 'var(--primary)', fontSize: '1.1rem' }}>
            Inventario Institucional
          </h2>
          <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
            Plataforma de Gestión de Activos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} autoComplete="on">
          <div className="form-group">
            <label className="form-label">Usuario o correo</label>
            <input
              className="form-input"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={isLocked}
              placeholder="admin@universidad.edu"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLocked}
              placeholder="••••••••"
            />
          </div>

          {/* Error banners */}
          {authError?.type === 'LOCK' && (
            <div className="alert alert-error">
              <span>🔒</span>
              <span>
                Cuenta bloqueada. Espera <strong>{formatLock()}</strong> para reintentar.
              </span>
            </div>
          )}
          {authError?.type === 'WARN' && (
            <div className="alert alert-warning">
              <span>⚠️</span>
              <span>
                {authError.remaining === 1
                  ? 'Credenciales inválidas. Último intento antes del bloqueo.'
                  : `Credenciales inválidas. Intentos restantes: ${authError.remaining}.`}
              </span>
            </div>
          )}
          {authError?.type === 'INFO' && (
            <div className="alert alert-info">
              <span>ℹ️</span>
              <span>{authError.message}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isLocked}
            style={{ marginBottom: 10 }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 18, height: 18 }} /> Verificando...</>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Google Sign-In */}
        <button
          className="btn btn-outlined w-full"
          onClick={handleGoogleLogin}
          disabled={isLocked}
          style={{ marginBottom: 6, justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuar con Google
        </button>

        <button
          className="btn btn-ghost w-full btn-sm"
          type="button"
          onClick={() => { setForgotOpen(true); setForgotMsg(null); setForgotUser('') }}
          disabled={isLocked}
          style={{ color: 'var(--primary)', marginBottom: 16 }}
        >
          Olvidé mi contraseña
        </button>

        <div className="divider" />

        {/* Accesos rápidos */}
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Acceso rápido por rol:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DEMO_USERS.map((u) => (
            <button
              key={u.username}
              className="chip"
              onClick={() => prefill(u)}
              disabled={isLocked}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forgot password dialog */}
      {forgotOpen && (
        <div className="modal-overlay" onClick={() => setForgotOpen(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Restablecer contraseña</h3>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setForgotOpen(false)}
              >✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 14 }}>
                Ingresa tu nombre de usuario para notificar al administrador.
              </p>
              <form onSubmit={handleForgot}>
                <div className="form-group">
                  <input
                    className="form-input"
                    placeholder="Nombre de usuario"
                    value={forgotUser}
                    onChange={(e) => setForgotUser(e.target.value)}
                  />
                </div>
                {forgotMsg && (
                  <div className={`alert alert-${forgotMsg.type === 'error' ? 'error' : 'success'}`}>
                    {forgotMsg.text}
                  </div>
                )}
                <div className="modal-footer" style={{ padding: 0, paddingTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setForgotOpen(false)}
                  >
                    Cerrar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Enviar solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
