import { useState, useCallback } from 'react'
import Layout from '../components/Layout.jsx'
import Modal from '../components/Modal.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { apiGetAsset } from '../api.js'
import {
  STATE_LABELS,
  STATE_BADGE,
  CATEGORIES,
  formatCurrency,
  formatDate,
  formatDateTime,
  depreciationValue,
} from '../theme.js'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconEye,
  IconHistory,
  IconPhoto,
  IconFilter,
  IconAlert,
} from '../components/Layout.jsx'

const ALL_STATES = Object.keys(STATE_LABELS)

const EMPTY_ASSET = {
  code: '',
  name: '',
  category: '',
  subcategory: '',
  physicalLocation: '',
  responsible: '',
  dependency: '',
  costCenter: '',
  acquisitionValue: '',
  acquisitionDate: '',
  estimatedUsefulLifeYears: 5,
  state: 'activo',
  observations: '',
  program: '',
}

export default function AssetsPage() {
  const { assets, createAsset, updateAsset, deleteAsset, loading } = useApp()
  const { canManageAssets, currentUser } = useAuth()
  const toast = useToast()

  const [search, setSearch]       = useState('')
  const [filterState, setFS]      = useState('')
  const [filterCat, setFC]        = useState('')
  const [filterDep, setFD]        = useState('')
  const [showFilters, setShowF]   = useState(false)

  // Modals
  const [createOpen, setCreateOpen]   = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [viewTarget, setViewTarget]   = useState(null)
  const [histTarget, setHistTarget]   = useState(null)
  const [histData, setHistData]       = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [missingOpen, setMissingOpen]   = useState(false)

  const [form, setForm]       = useState(EMPTY_ASSET)
  const [formErr, setFormErr] = useState(null)
  const [saving, setSaving]   = useState(false)

  const [missingCode, setMissingCode]   = useState('')
  const [missingNotes, setMissingNotes] = useState('')

  const { reportMissingAsset } = useApp()

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = assets.filter((a) => {
    const q = search.toLowerCase()
    if (q && !a.code?.toLowerCase().includes(q) && !a.name?.toLowerCase().includes(q) && !a.responsible?.toLowerCase().includes(q)) {
      return false
    }
    if (filterState && a.state !== filterState) return false
    if (filterCat && a.category?.toLowerCase() !== filterCat.toLowerCase()) return false
    if (filterDep && !a.dependency?.toLowerCase().includes(filterDep.toLowerCase())) return false
    return true
  })

  // ── Abrir crear / editar ──────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_ASSET)
    setFormErr(null)
    setCreateOpen(true)
  }

  function openEdit(asset) {
    setForm({
      code: asset.code,
      name: asset.name,
      category: asset.category,
      subcategory: asset.subcategory,
      physicalLocation: asset.physicalLocation,
      responsible: asset.responsible,
      dependency: asset.dependency,
      costCenter: asset.costCenter,
      acquisitionValue: asset.acquisitionValue?.toString() || '',
      acquisitionDate: asset.acquisitionDate
        ? new Date(asset.acquisitionDate).toISOString().slice(0, 10)
        : '',
      estimatedUsefulLifeYears: asset.estimatedUsefulLifeYears || 5,
      state: asset.state,
      observations: asset.observations || '',
      program: asset.program,
    })
    setFormErr(null)
    setEditTarget(asset)
  }

  async function openHistory(asset) {
    setHistTarget(asset)
    setHistLoading(true)
    try {
      const res = await apiGetAsset(asset.code)
      setHistData(res.data.history || [])
    } catch {
      setHistData([])
    } finally {
      setHistLoading(false)
    }
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  async function handleSave(isEdit) {
    if (!form.code.trim())    { setFormErr('El código es requerido.'); return }
    if (!form.name.trim())    { setFormErr('El nombre es requerido.'); return }
    if (!form.category.trim()) { setFormErr('La categoría es requerida.'); return }
    if (!form.dependency.trim()) { setFormErr('La dependencia es requerida.'); return }
    if (!form.acquisitionDate) { setFormErr('La fecha de adquisición es requerida.'); return }

    setSaving(true)
    setFormErr(null)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        subcategory: form.subcategory.trim(),
        physicalLocation: form.physicalLocation.trim(),
        responsible: form.responsible.trim(),
        dependency: form.dependency.trim(),
        costCenter: form.costCenter.trim(),
        acquisitionValue: parseFloat(form.acquisitionValue) || 0,
        acquisitionDate: form.acquisitionDate,
        estimatedUsefulLifeYears: parseInt(form.estimatedUsefulLifeYears) || 5,
        state: form.state,
        observations: form.observations.trim(),
        program: form.program.trim(),
      }

      if (isEdit) {
        await updateAsset(editTarget.code, payload, currentUser?.username)
        toast.success('Activo actualizado.')
        setEditTarget(null)
      } else {
        await createAsset({ code: form.code.trim(), ...payload })
        toast.success('Activo creado.')
        setCreateOpen(false)
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al guardar.'
      setFormErr(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteAsset(deleteTarget.code)
      toast.success('Activo eliminado.')
      setDeleteTarget(null)
    } catch {
      toast.error('No se pudo eliminar el activo.')
    } finally {
      setSaving(false)
    }
  }

  // ── Reportar faltante ─────────────────────────────────────────────────────
  function handleMissing() {
    if (!missingCode.trim()) return
    reportMissingAsset(missingCode.trim(), missingNotes.trim())
    toast.success('Reporte enviado a los administradores.')
    setMissingOpen(false)
    setMissingCode('')
    setMissingNotes('')
  }

  const canEdit = canManageAssets()

  return (
    <Layout title="Gestión de Activos">
      {/* Toolbar */}
      <div className="flex items-center gap-3" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus size={16} /> Nuevo activo
          </button>
        )}
        <button
          className="btn btn-outlined btn-sm"
          onClick={() => setMissingOpen(true)}
          style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
        >
          <IconAlert size={15} /> Reportar faltante
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
            placeholder="Buscar por código, nombre o responsable…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-outlined'}`}
          onClick={() => setShowF((v) => !v)}
        >
          <IconFilter size={15} /> Filtros
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div
          className="card"
          style={{ marginBottom: 14, padding: '14px 16px' }}
        >
          <div className="grid-3" style={{ gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filterState}
                onChange={(e) => setFS(e.target.value)}
              >
                <option value="">Todos</option>
                {ALL_STATES.map((s) => (
                  <option key={s} value={s}>{STATE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={filterCat}
                onChange={(e) => setFC(e.target.value)}
              >
                <option value="">Todas</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Dependencia</label>
              <input
                className="form-input"
                placeholder="Filtrar dependencia…"
                value={filterDep}
                onChange={(e) => setFD(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFS(''); setFC(''); setFD('') }}
            >
              Limpiar filtros
            </button>
            <span className="text-xs text-muted" style={{ marginLeft: 12 }}>
              {filtered.length} resultado(s)
            </span>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Ubicación</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Valor Adq.</th>
                <th>Valor Dep.</th>
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
                    Sin activos que mostrar.
                  </td>
                </tr>
              )}
              {filtered.map((asset) => (
                <tr key={asset.code}>
                  <td className="font-semibold" style={{ color: 'var(--primary)' }}>
                    {asset.code}
                  </td>
                  <td>{asset.name}</td>
                  <td className="text-sm">{asset.category}</td>
                  <td className="text-sm">{asset.physicalLocation}</td>
                  <td className="text-sm">{asset.responsible || '—'}</td>
                  <td>
                    <span className={`badge ${STATE_BADGE[asset.state]}`}>
                      {STATE_LABELS[asset.state] || asset.state}
                    </span>
                  </td>
                  <td className="text-sm">{formatCurrency(asset.acquisitionValue)}</td>
                  <td className="text-sm">{formatCurrency(depreciationValue(asset))}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Ver detalles"
                        onClick={() => setViewTarget(asset)}
                      >
                        <IconEye size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Historial"
                        onClick={() => openHistory(asset)}
                      >
                        <IconHistory size={14} />
                      </button>
                      {canEdit && (
                        <>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Editar"
                            onClick={() => openEdit(asset)}
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Eliminar"
                            style={{ color: 'var(--error)' }}
                            onClick={() => setDeleteTarget(asset)}
                          >
                            <IconTrash size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Crear ─────────────────────────────────────────────────────── */}
      <AssetFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo Activo"
        form={form}
        setForm={setForm}
        formErr={formErr}
        saving={saving}
        onSave={() => handleSave(false)}
        isEdit={false}
      />

      {/* ── Modal Editar ─────────────────────────────────────────────────────── */}
      <AssetFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Editar: ${editTarget?.code}`}
        form={form}
        setForm={setForm}
        formErr={formErr}
        saving={saving}
        onSave={() => handleSave(true)}
        isEdit={true}
      />

      {/* ── Modal Ver detalles ────────────────────────────────────────────────── */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={`Detalle: ${viewTarget?.code}`}
        maxWidth={640}
        footer={
          <button className="btn btn-primary" onClick={() => setViewTarget(null)}>
            Cerrar
          </button>
        }
      >
        {viewTarget && <AssetDetail asset={viewTarget} />}
      </Modal>

      {/* ── Modal Historial ──────────────────────────────────────────────────── */}
      <Modal
        open={!!histTarget}
        onClose={() => setHistTarget(null)}
        title={`Historial: ${histTarget?.code}`}
        maxWidth={620}
        footer={
          <button className="btn btn-primary" onClick={() => setHistTarget(null)}>
            Cerrar
          </button>
        }
      >
        {histLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <span className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : histData.length === 0 ? (
          <p>Sin historial registrado.</p>
        ) : (
          <div>
            {histData.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="badge badge-blue">{h.action}</span>
                  <span className="text-xs text-muted">{formatDateTime(h.timestamp)}</span>
                </div>
                <p style={{ marginTop: 4, fontSize: '0.875rem' }}>{h.detail}</p>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Por: {h.performedBy}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Modal Eliminar ───────────────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar activo"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
              {saving ? 'Eliminando…' : 'Eliminar'}
            </button>
          </>
        }
      >
        <p>
          ¿Eliminar el activo <strong>{deleteTarget?.code} — {deleteTarget?.name}</strong>?
          Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* ── Modal Reportar faltante ──────────────────────────────────────────── */}
      <Modal
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
        title="Reportar activo no encontrado"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setMissingOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleMissing} disabled={!missingCode.trim()}>
              Enviar reporte
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Código del activo</label>
          <input
            className="form-input"
            placeholder="Ej: ACT-1001"
            value={missingCode}
            onChange={(e) => setMissingCode(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Notas adicionales</label>
          <textarea
            className="form-textarea"
            placeholder="Descripción de la situación…"
            value={missingNotes}
            onChange={(e) => setMissingNotes(e.target.value)}
          />
        </div>
      </Modal>
    </Layout>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function AssetFormModal({ open, onClose, title, form, setForm, formErr, saving, onSave, isEdit }) {
  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth={680}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear activo'}
          </button>
        </>
      }
    >
      {formErr && <div className="alert alert-error">{formErr}</div>}

      <div className="grid-2">
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Código *</label>
            <input
              className="form-input"
              placeholder="ACT-1001"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input
            className="form-input"
            placeholder="Laptop Dell XPS 15"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Categoría *</label>
          <select
            className="form-select"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Seleccionar…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Subcategoría</label>
          <input
            className="form-input"
            placeholder="Portátil"
            value={form.subcategory}
            onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Dependencia *</label>
          <input
            className="form-input"
            placeholder="Almacén e Inventarios"
            value={form.dependency}
            onChange={(e) => setForm((f) => ({ ...f, dependency: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Programa</label>
          <input
            className="form-input"
            placeholder="Administración"
            value={form.program}
            onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Ubicación física</label>
          <input
            className="form-input"
            placeholder="Piso 2, Oficina 204"
            value={form.physicalLocation}
            onChange={(e) => setForm((f) => ({ ...f, physicalLocation: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Responsable</label>
          <input
            className="form-input"
            placeholder="Juan Pérez"
            value={form.responsible}
            onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Centro de costo</label>
          <input
            className="form-input"
            placeholder="CC-ADM-01"
            value={form.costCenter}
            onChange={(e) => setForm((f) => ({ ...f, costCenter: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Valor de adquisición (COP)</label>
          <input
            className="form-input"
            type="number"
            min={0}
            placeholder="3800000"
            value={form.acquisitionValue}
            onChange={(e) => setForm((f) => ({ ...f, acquisitionValue: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Fecha de adquisición *</label>
          <input
            className="form-input"
            type="date"
            value={form.acquisitionDate}
            onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Vida útil estimada (años)</label>
          <input
            className="form-input"
            type="number"
            min={1}
            max={50}
            value={form.estimatedUsefulLifeYears}
            onChange={(e) => setForm((f) => ({ ...f, estimatedUsefulLifeYears: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Estado</label>
        <select
          className="form-select"
          value={form.state}
          onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
        >
          {Object.keys(STATE_LABELS).map((s) => (
            <option key={s} value={s}>{STATE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones</label>
        <textarea
          className="form-textarea"
          placeholder="Condición del activo, notas relevantes…"
          value={form.observations}
          onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
        />
      </div>
    </Modal>
  )
}

function AssetDetail({ asset }) {
  const rows = [
    ['Código', asset.code],
    ['Nombre', asset.name],
    ['Categoría', asset.category],
    ['Subcategoría', asset.subcategory],
    ['Dependencia', asset.dependency],
    ['Programa', asset.program],
    ['Ubicación física', asset.physicalLocation],
    ['Responsable', asset.responsible || '—'],
    ['Centro de costo', asset.costCenter],
    ['Estado', <span className={`badge ${STATE_BADGE[asset.state]}`}>{STATE_LABELS[asset.state]}</span>],
    ['Valor adquisición', formatCurrency(asset.acquisitionValue)],
    ['Valor depreciado', formatCurrency(depreciationValue(asset))],
    ['Fecha adquisición', formatDate(asset.acquisitionDate)],
    ['Vida útil estimada', `${asset.estimatedUsefulLifeYears} años`],
    ['Observaciones', asset.observations || '—'],
  ]
  return (
    <div>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between"
          style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-sm text-muted">{label}</span>
          <span className="text-sm font-semibold" style={{ textAlign: 'right', maxWidth: '60%' }}>
            {value}
          </span>
        </div>
      ))}
      {asset.photoBase64 && (
        <div style={{ marginTop: 14 }}>
          <p className="text-sm text-muted" style={{ marginBottom: 6 }}>Foto del activo</p>
          <img
            src={`data:image/jpeg;base64,${asset.photoBase64}`}
            alt="Foto del activo"
            style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 300 }}
          />
        </div>
      )}
    </div>
  )
}
