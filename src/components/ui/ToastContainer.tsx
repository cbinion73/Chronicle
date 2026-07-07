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
      bottom: 'calc(32px + env(safe-area-inset-bottom))',
      right: 'calc(32px + env(safe-area-inset-right))',
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
          <span style={{ flex: 1 }}>{toast.message}</span>
          {toast.action && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                toast.action!.onClick();
                removeToast(toast.id);
              }}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {toast.action.label}
            </button>
          )}
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
