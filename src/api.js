import axios from 'axios'
import { toCamel, toSnake } from './theme.js'

// En producción EC2 con Nginx: VITE_BACKEND_URL=''  → URLs relativas (/api/...)
// En desarrollo local:        VITE_BACKEND_URL no definido → fallback al EC2
// ?? (nullish) preserva el string vacío; || lo descartaría como falsy
const BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? 'http://18.223.120.46:3000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
})

// Normalizar respuestas a camelCase
client.interceptors.response.use(
  (res) => {
    res.data = toCamel(res.data)
    return res
  },
  (err) => Promise.reject(err),
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiLogin = (identifier, password) =>
  client.post('/api/auth/login', { identifier, password })

export const apiGoogleLogin = (email) =>
  client.post('/api/auth/google-login', { email })

// ── Users ─────────────────────────────────────────────────────────────────────
export const apiGetUsers = () => client.get('/api/users')

export const apiCreateUser = (data) =>
  client.post('/api/users', toSnake(data))

export const apiUpdateUser = (id, data) =>
  client.patch(`/api/users/${id}`, toSnake(data))

export const apiUpdatePassword = (id, password) =>
  client.patch(`/api/users/${id}/password`, { password })

export const apiDeleteUser = (id) => client.delete(`/api/users/${id}`)

// ── Assets ────────────────────────────────────────────────────────────────────
export const apiGetAssets = (params = {}) =>
  client.get('/api/assets', { params })

export const apiGetAsset = (code) => client.get(`/api/assets/${code}`)

export const apiCreateAsset = (data) =>
  client.post('/api/assets', toSnake(data))

export const apiUpdateAsset = (code, data) =>
  client.patch(`/api/assets/${code}`, toSnake(data))

export const apiDeleteAsset = (code) => client.delete(`/api/assets/${code}`)

export const apiAddHistory = (code, data) =>
  client.post(`/api/assets/${code}/history`, toSnake(data))

// ── Inventory sessions ────────────────────────────────────────────────────────
export const apiGetInventorySessions = () =>
  client.get('/api/inventory/sessions')

export const apiCreateInventorySession = (data) =>
  client.post('/api/inventory/sessions', toSnake(data))

export const apiAddVerification = (sessionId, data) =>
  client.post(`/api/inventory/sessions/${sessionId}/verifications`, toSnake(data))
