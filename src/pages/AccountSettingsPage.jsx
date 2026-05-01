import { useState } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { apiUpdateUser, apiUpdatePassword, apiLogin } from '../api.js'
import { ROLE_LABELS } from '../theme.js'
import { IconUser, IconKey, IconCheck } from '../components/Layout.jsx'

export default function AccountSettingsPage() {
  const { currentUser, setCurrentUser } = useAuth()
  const toast = useToast()

  // ── Perfil ────────────────────────────────────────────────────────────────
  const [fullName, setFullName]   = useState(currentUser?.fullName || '')
  const [profileErr, setProfileErr] = useState(null)
  const [profileSaving, setPS]    = useState(false)

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!fullName.trim()) { setProfileErr('El nombre es requerido.'); return }
    setPS(true)
    setProfileErr(null)
    try {
      await apiUpdateUser(currentUser.id, { full_name: fullName.trim() })
      setCurrentUser((u) => ({ ...u, fullName: fullName.trim() }))
      toast.success('Perfil actualizado.')
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'No se pudo actualizar el perfil.')
    } finally {
      setPS(false)
    }
  }

  // ── Contraseña ────────────────────────────────────────────────────────────
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [newPwd2, setNewPwd2] = useState('')
  const [pwdErr,  setPwdErr]  = useState(null)
  const [pwdSaving, setPwdS]  = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!curPwd)          { setPwdErr('Ingresa la contraseña actual.'); return }
    if (!newPwd)          { setPwdErr('Ingresa la nueva contraseña.'); return }
    if (newPwd.length < 6){ setPwdErr('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    if (newPwd !== newPwd2){ setPwdErr('Las contraseñas nuevas no coinciden.'); return }

    setPwdS(true)
    setPwdErr(null)
    try {
      // Verificar contraseña actual
      await apiLogin(currentUser.username, curPwd)
    } catch {
      setPwdErr('La contraseña actual es incorrecta.')
      setPwdS(false)
      return
    }
    try {
      await apiUpdatePassword(currentUser.id, newPwd)
      toast.success('Contraseña actualizada correctamente.')
      setCurPwd(''); setNewPwd(''); setNewPwd2('')
    } catch (err) {
      setPwdErr(err.response?.data?.error || 'No se pudo cambiar la contraseña.')
    } finally {
      setPwdS(false)
    }
  }

  return (
    <Layout title="Mi Cuenta">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Información de usuario */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>
            <IconUser size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Información de la cuenta
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['ID', currentUser?.id],
                ['Usuario', currentUser?.username],
                ['Correo', currentUser?.email],
                ['Área', currentUser?.area || '—'],
                ['Rol(es)', (currentUser?.roles || []).map((r) => ROLE_LABELS[r] || r).join(', ')],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td
                    style={{
                      padding: '7px 0',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      width: '38%',
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: '7px 0',
                      borderBottom: '1px solid var(--border)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Editar nombre */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>
            <IconUser size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Actualizar nombre
          </h3>
          <form onSubmit={handleSaveProfile}>
            {profileErr && <div className="alert alert-error">{profileErr}</div>}
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Guardando…' : <><IconCheck size={14} /> Guardar nombre</>}
            </button>
          </form>
        </div>

        {/* Cambiar contraseña */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>
            <IconKey size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Cambiar contraseña
          </h3>
          <form onSubmit={handleChangePassword}>
            {pwdErr && <div className="alert alert-error">{pwdErr}</div>}
            <div className="form-group">
              <label className="form-label">Contraseña actual</label>
              <input
                className="form-input"
                type="password"
                value={curPwd}
                onChange={(e) => setCurPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nueva contraseña</label>
              <input
                className="form-input"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nueva contraseña</label>
              <input
                className="form-input"
                type="password"
                value={newPwd2}
                onChange={(e) => setNewPwd2(e.target.value)}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
              {pwdSaving ? 'Cambiando…' : <><IconKey size={14} /> Cambiar contraseña</>}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
