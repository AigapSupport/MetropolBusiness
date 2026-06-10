/**
 * Basit yerel toast altyapısı (PANELS_SPEC §0.2) — kütüphane yok.
 * ToastProvider en üste sarılır; useToast() ile success/error gösterilir.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { colors, radii } from '../../theme/tokens';

type ToastKind = 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 360,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            style={{
              padding: '10px 14px',
              borderRadius: radii.md,
              fontSize: 13,
              color: colors.textOnPrimary,
              backgroundColor: toast.kind === 'success' ? colors.success : colors.danger,
              boxShadow: `0 4px 12px ${colors.overlay}`,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast yalnızca ToastProvider altında kullanılabilir.');
  }
  return context;
}
