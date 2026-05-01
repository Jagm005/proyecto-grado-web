// ── Constantes de dominio ─────────────────────────────────────────────────────

export const ROLE_LABELS = {
  auxiliarInventario: 'Auxiliar de Inventario',
  administrador: 'Administrador',
  responsableArea: 'Responsable de Área',
  direccionAdminFin: 'Dirección Administrativa y Financiera',
  auditor: 'Auditor',
  soporteTI: 'Soporte TI',
}

export const ALL_ROLES = Object.keys(ROLE_LABELS)

export const STATE_LABELS = {
  activo:        'Activo',
  reubicado:     'Reubicado',
  noEncontrado:  'No Encontrado',
  obsoleto:      'Obsoleto',
  enReparacion:  'En Reparación',
  paraBaja:      'Para Baja',
}

export const STATE_BADGE = {
  activo:       'badge-green',
  reubicado:    'badge-blue',
  noEncontrado: 'badge-red',
  obsoleto:     'badge-gray',
  enReparacion: 'badge-yellow',
  paraBaja:     'badge-orange',
}

export const CATEGORIES = [
  'Cómputo',
  'Mobiliario',
  'Equipos de Laboratorio',
  'Equipos de Audio/Video',
  'Vehículos',
  'Herramientas',
  'Equipos de Comunicación',
  'Otros',
]

// ── Utilidades de cálculo ─────────────────────────────────────────────────────

export function depreciationValue(asset, atDate = new Date()) {
  const years =
    (atDate - new Date(asset.acquisitionDate)) / (365 * 24 * 60 * 60 * 1000)
  const annual =
    asset.acquisitionValue / Math.max(1, asset.estimatedUsefulLifeYears)
  return Math.max(0, asset.acquisitionValue - annual * years)
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Normalización snake_case ↔ camelCase ──────────────────────────────────────

function camelize(str) {
  return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
}

export function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel)
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[camelize(key)] = toCamel(obj[key])
      return acc
    }, {})
  }
  return obj
}

function snakify(str) {
  return str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
}

export function toSnake(obj) {
  if (Array.isArray(obj)) return obj.map(toSnake)
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[snakify(key)] = toSnake(obj[key])
      return acc
    }, {})
  }
  return obj
}
