import { useState } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  ROLE_LABELS,
  ALL_ROLES,
  formatDateTime,
} from '../theme.js'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconKey,
  IconSearch,
  IconUser,
  IconMail,
  IconCheck,
} from '../components/Layout.jsx'

const EMPTY_FORM = {
  id: '',
  username: '',
  fullName: '',
  email: '',
  password: '',
  area: '',
  roles: ['auxiliarInventario'],
  isActive: true,
}

export default function UsersPage() {
  const { users, createUser, updateUser, resetPassword, deleteUser, loading } = useApp()
  const { currentUser } = useAuth()
  const toast = useToast()

  const [search, setSearch]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState(null)   // null = create
  const [form, setForm]               = useState(EMPTY_FORM)
  const [formErr, setFormErr]         = useState(null)
  const [saving, setSaving]           = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [newPwd, setNewPwd]           = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)

  // Max intentos (admin setting — solo local en web)
  const [maxAttempts, setMaxAttempts] = useState(5)

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  // ── Abrir modal crear / editar ────────────────────────────────────────────
  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      id: `U${String(Date.now()).slice(-6)}`,
    })
    setFormErr(null)
    setModalOpen(true)
  }

  function openEdit(user) {
    setEditing(user)
    setForm({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      password: '',
      area: user.area || '',
      roles: Array.isArray(user.roles) ? user.roles : [],
      isActive: user.isActive ?? true,
    })
    setFormErr(null)
    setModalOpen(true)
  }

  function toggleRole(role) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }))
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.fullName.trim()) { setFormErr('El nombre es requerido.'); return }
    if (!form.email.trim())    { setFormErr('El correo es requerido.'); return }
    if (!form.roles.length)    { setFormErr('Selecciona al menos un rol.'); return }
    if (!editing && !form.password) { setFormErr('La contraseña es requerida.'); return }

    setSaving(true)
    setFormErr(null)
    try {
      if (editing) {
        const payload = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          area: form.area.trim(),
          roles: form.roles,
          isActive: form.isActive,
        }
        await updateUser(editing.id, payload)
        toast.success('Usuario actualizado correctamente.')
      } else {
        await createUser({
          id: form.id,
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          area: form.area.trim(),
          roles: form.roles,
        })
        toast.success('Usuario creado correctamente.')
      }
      setModalOpen(false)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al guardar.'
      setFormErr(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Reset contraseña ──────────────────────────────────────────────────────
  async function handleResetPassword() {
    if (!resetTarget) return
    setSaving(true)
    try {
      const pwd = await resetPassword(resetTarget)
      setNewPwd(pwd)
      setResetTarget(null)
    } catch {
      toast.error('No se pudo restablecer la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteUser(deleteTarget.id)
      toast.success('Usuario eliminado.')
      setDeleteTarget(null)
    } catch {
      toast.error('No se pudo eliminar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Gestión de Usuarios">
      {/* Toolbar */}
      <div className="flex items-center gap-3" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <IconPlus size={16} /> Crear usuario
        </button>

        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <IconSearch
            size={16}
            style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-secondary)',
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por usuario, nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Intentos máx. de bloqueo:</span>
          <input
            className="form-input"
            type="number"
            min={1}
            max={20}
            style={{ width: 72 }}
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 5)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Nombre completo</th>
                <th>Correo</th>
                <th>Roles</th>
                <th>Área</th>
                <th>Estado</th>
                <th>Última sesión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 24 }}>
                    <span className="spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                    Sin usuarios que mostrar.
                  </td>
                </tr>
              )}
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="text-xs text-muted">{user.id}</td>
                  <td className="font-semibold">{user.username}</td>
                  <td>{user.fullName}</td>
                  <td className="text-sm">{user.email}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(Array.isArray(user.roles) ? user.roles : []).map((r) => (
                        <span key={r} className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          {ROLE_LABELS[r] || r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-sm">{user.area || '—'}</td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{formatDateTime(user.lastSession)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Editar"
                        onClick={() => openEdit(user)}
                      >
                        <IconEdit size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Restablecer contraseña"
                        style={{ color: 'var(--warning)' }}
                        onClick={() => { setResetTarget(user); setNewPwd(null) }}
                      >
                        <IconKey size={15} />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Eliminar"
                          style={{ color: 'var(--error)' }}
                          onClick={() => setDeleteTarget(user)}
                        >
                          <IconTrash size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar: ${editing.username}` : 'Crear nuevo usuario'}
        maxWidth={600}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </>
        }
      >
        {formErr && <div className="alert alert-error">{formErr}</div>}

        <div className="grid-2">
          {!editing && (
            <div className="form-group">
              <label className="form-label">
                <IconUser size={13} /> Usuario (login)
              </label>
              <input
                className="form-input"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="Ej: jperez"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input
              className="form-input"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Juan Pérez"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <IconMail size={13} /> Correo electrónico
            </label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jperez@universidad.edu"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Área / Dependencia</label>
            <input
              className="form-input"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              placeholder="Almacén e Inventarios"
            />
          </div>
        </div>

        {!editing && (
          <div className="form-group">
            <label className="form-label">Contraseña inicial</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Roles asignados</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {ALL_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip ${form.roles.includes(r) ? 'selected' : ''}`}
                onClick={() => toggleRole(r)}
              >
                {form.roles.includes(r) && <IconCheck size={11} />}
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {editing && (
          <div className="form-group">
            <label className="form-label">Estado de la cuenta</label>
            <div className="flex gap-3" style={{ marginTop: 4 }}>
              <button
                type="button"
                className={`chip ${form.isActive ? 'selected' : ''}`}
                onClick={() => setForm((f) => ({ ...f, isActive: true }))}
              >
                Activo
              </button>
              <button
                type="button"
                className={`chip ${!form.isActive ? 'selected' : ''}`}
                style={!form.isActive ? { borderColor: 'var(--error)', color: 'var(--error)', background: 'var(--error-light)' } : {}}
                onClick={() => setForm((f) => ({ ...f, isActive: false }))}
              >
                Inactivo
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmar reset contraseña */}
      <Modal
        open={!!resetTarget && !newPwd}
        onClose={() => setResetTarget(null)}
        title="Restablecer contraseña"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setResetTarget(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={handleResetPassword}
              disabled={saving}
            >
              {saving ? 'Generando…' : 'Restablecer'}
            </button>
          </>
        }
      >
        <p>
          ¿Generar una nueva contraseña aleatoria para{' '}
          <strong>{resetTarget?.fullName}</strong> ({resetTarget?.username})?
        </p>
        <p style={{ marginTop: 8 }}>La contraseña actual quedará invalidada.</p>
      </Modal>

      {/* Modal mostrar nueva contraseña */}
      <Modal
        open={!!newPwd}
        onClose={() => setNewPwd(null)}
        title="Contraseña restablecida"
        footer={
          <button className="btn btn-primary" onClick={() => setNewPwd(null)}>
            Cerrar
          </button>
        }
      >
        <p style={{ marginBottom: 12 }}>Nueva contraseña generada:</p>
        <div
          style={{
            background: 'var(--background)',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            fontWeight: 700,
            letterSpacing: 2,
            textAlign: 'center',
            userSelect: 'all',
          }}
        >
          {newPwd}
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 10 }}>
          Copia y comunica esta contraseña al usuario de forma segura. No se puede recuperar después.
        </p>
      </Modal>

      {/* Modal confirmar eliminación */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar usuario"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? 'Eliminando…' : 'Eliminar'}
            </button>
          </>
        }
      >
        <p>
          ¿Estás seguro de eliminar a{' '}
          <strong>{deleteTarget?.fullName}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </Layout>
  )
}
