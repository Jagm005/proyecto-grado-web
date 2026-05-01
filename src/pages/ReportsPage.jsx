import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import Layout from '../components/Layout.jsx'
import { useApp } from '../context/AppContext.jsx'
import {
  STATE_LABELS,
  STATE_BADGE,
  CATEGORIES,
  formatCurrency,
  formatDate,
  depreciationValue,
} from '../theme.js'
import {
  IconFilter,
  IconDownload,
  IconAlert,
  IconRefresh,
} from '../components/Layout.jsx'

const PERIODS = [
  { value: 'mensual',    label: 'Mensual' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
]

export default function ReportsPage() {
  const { assets, auditFindings } = useApp()

  const [period,   setPeriod]   = useState('mensual')
  const [state,    setState]    = useState('')
  const [dep,      setDep]      = useState('')
  const [program,  setProgram]  = useState('')
  const [category, setCategory] = useState('')
  const [resp,     setResp]     = useState('')
  const [filtered, setFiltered] = useState(null)   // null = sin filtrar todavía

  const findings = auditFindings()

  // ── Filtrar ───────────────────────────────────────────────────────────────
  function applyFilters() {
    const result = assets.filter((a) => {
      if (state    && a.state     !== state)                                   return false
      if (dep      && !a.dependency?.toLowerCase().includes(dep.toLowerCase()))    return false
      if (program  && a.program?.toLowerCase() !== program.toLowerCase())          return false
      if (category && a.category?.toLowerCase() !== category.toLowerCase())        return false
      if (resp     && !a.responsible?.toLowerCase().includes(resp.toLowerCase()))  return false
      return true
    })
    setFiltered(result)
  }

  function resetFilters() {
    setState(''); setDep(''); setProgram(''); setCategory(''); setResp('')
    setFiltered(null)
  }

  const data = filtered ?? assets

  // ── Export PDF ────────────────────────────────────────────────────────────
  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Reporte Institucional de Inventario', 14, 16)
    doc.setFontSize(10)
    doc.text(`Período: ${period}`, 14, 24)
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 30)

    autoTable(doc, {
      startY: 36,
      head: [[
        'Código', 'Nombre', 'Categoría', 'Ubicación',
        'Estado', 'Responsable', 'Dependencia',
        'Val. Adq.', 'Val. Dep.',
      ]],
      body: data.map((a) => [
        a.code,
        a.name,
        a.category,
        a.physicalLocation,
        STATE_LABELS[a.state] || a.state,
        a.responsible,
        a.dependency,
        formatCurrency(a.acquisitionValue),
        formatCurrency(depreciationValue(a)),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 128, 78] },
      alternateRowStyles: { fillColor: [240, 247, 244] },
    })

    doc.save(`inventario_${period}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ── Export Excel ──────────────────────────────────────────────────────────
  function exportExcel() {
    const rows = data.map((a) => ({
      Código:              a.code,
      Nombre:              a.name,
      Categoría:           a.category,
      Subcategoría:        a.subcategory,
      'Ubicación física':  a.physicalLocation,
      Responsable:         a.responsible,
      Dependencia:         a.dependency,
      Programa:            a.program,
      Estado:              STATE_LABELS[a.state] || a.state,
      'Valor Adquisición': a.acquisitionValue,
      'Valor Depreciado':  Math.round(depreciationValue(a)),
      'Fecha Adquisición': formatDate(a.acquisitionDate),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `inventario_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = [
      'codigo', 'nombre', 'categoria', 'subcategoria',
      'ubicacion', 'responsable', 'dependencia', 'programa',
      'estado', 'valor_adquisicion', 'valor_depreciado', 'fecha_adquisicion',
    ]
    const rows = data.map((a) => [
      a.code,
      `"${a.name?.replace(/"/g, '""')}"`,
      `"${a.category?.replace(/"/g, '""')}"`,
      `"${a.subcategory?.replace(/"/g, '""')}"`,
      `"${a.physicalLocation?.replace(/"/g, '""')}"`,
      `"${a.responsible?.replace(/"/g, '""')}"`,
      `"${a.dependency?.replace(/"/g, '""')}"`,
      `"${a.program?.replace(/"/g, '""')}"`,
      STATE_LABELS[a.state] || a.state,
      a.acquisitionValue,
      depreciationValue(a).toFixed(2),
      formatDate(a.acquisitionDate),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `inventario_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Dependencias únicas para el selector
  const deps = [...new Set(assets.map((a) => a.dependency).filter(Boolean))]

  return (
    <Layout title="Reportes e Informes">
      {/* Controles de período + exportar */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">Período:</span>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  className={`chip ${period === p.value ? 'selected' : ''}`}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-outlined btn-sm" onClick={exportPDF}>
              <IconDownload size={14} /> PDF
            </button>
            <button className="btn btn-outlined btn-sm" onClick={exportExcel}>
              <IconDownload size={14} /> Excel
            </button>
            <button className="btn btn-outlined btn-sm" onClick={exportCSV}>
              <IconDownload size={14} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <h3 style={{ marginBottom: 12 }}>
          <IconFilter size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Filtros del informe
        </h3>
        <div className="grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select className="form-select" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Todos</option>
              {Object.keys(STATE_LABELS).map((s) => (
                <option key={s} value={s}>{STATE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Dependencia</label>
            <select className="form-select" value={dep} onChange={(e) => setDep(e.target.value)}>
              <option value="">Todas</option>
              {deps.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Categoría</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Programa</label>
            <input
              className="form-input"
              placeholder="Nombre del programa…"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Responsable</label>
            <input
              className="form-input"
              placeholder="Nombre del responsable…"
              value={resp}
              onChange={(e) => setResp(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2" style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>
            <IconFilter size={14} /> Aplicar filtros
          </button>
          <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
            <IconRefresh size={14} /> Restablecer
          </button>
          <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>
            {data.length} activo(s)
          </span>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid-3" style={{ marginBottom: 16, gap: 12 }}>
        <SummaryCard
          label="Total activos"
          value={data.length}
          color="var(--primary)"
        />
        <SummaryCard
          label="Valor total adquisición"
          value={formatCurrency(data.reduce((s, a) => s + (a.acquisitionValue || 0), 0))}
          color="var(--info)"
        />
        <SummaryCard
          label="Valor total depreciado"
          value={formatCurrency(data.reduce((s, a) => s + depreciationValue(a), 0))}
          color="var(--success)"
        />
      </div>

      {/* Tabla de resultados */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ padding: '14px 18px 0', fontWeight: 600 }}>
          Activos filtrados ({data.length})
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Dependencia</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Val. Adquisición</th>
                <th>Val. Depreciado</th>
                <th>F. Adquisición</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                    Sin resultados.
                  </td>
                </tr>
              )}
              {data.map((a) => (
                <tr key={a.code}>
                  <td className="font-semibold" style={{ color: 'var(--primary)' }}>{a.code}</td>
                  <td>{a.name}</td>
                  <td>{a.category}</td>
                  <td>{a.dependency}</td>
                  <td>
                    <span className={`badge ${STATE_BADGE[a.state]}`}>
                      {STATE_LABELS[a.state]}
                    </span>
                  </td>
                  <td>{a.responsible || '—'}</td>
                  <td>{formatCurrency(a.acquisitionValue)}</td>
                  <td>{formatCurrency(depreciationValue(a))}</td>
                  <td>{formatDate(a.acquisitionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hallazgos de auditoría */}
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>
          <IconAlert size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--warning)' }} />
          Hallazgos de Auditoría
        </h3>
        <div className="grid-3" style={{ gap: 12 }}>
          <FindingCard
            title="Activos No Encontrados"
            items={findings.notFound}
            color="var(--error)"
            bg="var(--error-light)"
          />
          <FindingCard
            title="Códigos Duplicados"
            items={findings.duplicated}
            color="var(--warning)"
            bg="var(--warning-light)"
          />
          <FindingCard
            title="Sin Responsable"
            items={findings.withoutResponsible}
            color="var(--info)"
            bg="var(--info-light)"
          />
        </div>
      </div>
    </Layout>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
      <div className="text-sm text-muted">{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function FindingCard({ title, items, color, bg }) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        padding: '12px 14px',
        border: `1.5px solid ${color}30`,
      }}
    >
      <div style={{ color, fontWeight: 600, marginBottom: 8 }}>
        {title}: <strong>{items.length}</strong>
      </div>
      {items.length === 0 ? (
        <span className="text-xs text-muted">Sin hallazgos ✓</span>
      ) : (
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {items.slice(0, 20).map((code) => (
            <div key={code} className="badge badge-gray" style={{ marginBottom: 4, display: 'block' }}>
              {code}
            </div>
          ))}
          {items.length > 20 && (
            <span className="text-xs text-muted">+{items.length - 20} más</span>
          )}
        </div>
      )}
    </div>
  )
}
