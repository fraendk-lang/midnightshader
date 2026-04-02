/* eslint-disable react-refresh/only-export-components -- Provider + useToast Hook */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastVariant = 'ok' | 'err' | 'info'

export type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  push: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setToasts((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = crypto.randomUUID()
      setToasts((xs) => [...xs, { id, message, variant }])
      const tid = setTimeout(() => remove(id), variant === 'err' ? 7000 : 4200)
      timers.current.set(id, tid)
    },
    [remove],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite" aria-relevant="additions text">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast toast--${t.variant}`}
          >
            <span className="toast__msg">{t.message}</span>
            <button type="button" className="toast__close" onClick={() => remove(t.id)} aria-label="Schließen">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast außerhalb von ToastProvider')
  return ctx
}
