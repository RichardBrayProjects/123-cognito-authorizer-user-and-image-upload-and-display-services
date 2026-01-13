import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastContextType {
  toast: Toast | null;
  showToast: (toast: Toast | null) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((newToast: Toast | null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(newToast);
  }, []);

  useEffect(() => {
    if (toast) {
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, 3000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [toast]);

  const value = useMemo(() => ({ toast, showToast }), [toast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const Toaster = () => {
  const { toast, showToast } = useToast();
  
  if (!toast) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] max-w-md w-full px-4">
      <div
        className={cn(
          'relative flex items-center gap-4 rounded-md border p-6 pr-8 shadow-lg',
          toast.variant === 'destructive'
            ? 'border-destructive bg-destructive text-destructive-foreground'
            : 'border bg-background text-foreground'
        )}
      >
        <div className="grid gap-1 flex-1">
          {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
          {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
        </div>
        <button
          onClick={() => showToast(null)}
          className="absolute right-2 top-2 p-1 opacity-50 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
