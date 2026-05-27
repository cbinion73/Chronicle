import { useToastStore } from '../../store/toastStore';

const BG: Record<string, string> = {
  success: 'var(--accent-green)',
  info: 'var(--accent-blue)',
  warning: 'var(--accent-amber)',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      right: 32,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            background: BG[toast.type],
            color: 'white',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.2s ease',
            pointerEvents: 'auto',
            cursor: 'pointer',
            maxWidth: 320,
          }}
          onClick={() => removeToast(toast.id)}
        >
          {toast.icon && <span style={{ fontSize: 16 }}>{toast.icon}</span>}
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
