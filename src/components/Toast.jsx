import { createContext, useContext, useState, useCallback } from 'react'
import { IconCheck, IconX, IconInfo } from './Layout.jsx'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const success = useCallback((msg) => show(msg, 'success'), [show])
  const error   = useCallback((msg) => show(msg, 'error', 5000), [show])
  const info    = useCallback((msg) => show(msg, 'info'), [show])

  return (
    <ToastCtx.Provider value={{ show, success, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <IconCheck size={16} />}
            {t.type === 'error'   && <IconX     size={16} />}
            {t.type === 'info'    && <IconInfo   size={16} />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
