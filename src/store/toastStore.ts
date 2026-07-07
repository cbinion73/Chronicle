import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  icon?: string;
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], icon?: string, action?: ToastAction, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

// Undo toasts (grace over guilt: no window.confirm, a real window to reverse
// a delete) get longer than a plain confirmation to give a beat to react in.
const DEFAULT_DURATION = 3000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'success', icon, action, durationMs = DEFAULT_DURATION) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, icon, action }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, durationMs);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
