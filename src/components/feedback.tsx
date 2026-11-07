import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button, cx, Modal } from './ui';
import { errorMessage } from '../db/errors';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}
interface ConfirmOpts {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface FeedbackCtx {
  toast: (text: string, kind?: ToastKind) => void;
  toastError: (e: unknown) => void;
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<FeedbackCtx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: ToastKind = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3000);
  }, []);
  const toastError = useCallback((e: unknown) => {
    console.error(e);
    toast(errorMessage(e), 'error');
  }, [toast]);
  const confirm = useCallback((o: ConfirmOpts) => {
    setDialog(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);
  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, toastError, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 pt-safe" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex w-full max-w-md items-start gap-2 whitespace-pre-line rounded-xl border px-3 py-2.5 text-sm shadow-lg',
              t.kind === 'error' ? 'border-danger/40 bg-[#2a1216] text-danger' : t.kind === 'info' ? 'border-info/40 bg-[#0f2230] text-info' : 'border-ok/40 bg-[#0f2a20] text-ok',
            )}
          >
            {t.kind === 'error' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{t.text}</span>
            <button aria-label="Đóng thông báo" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <Modal
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title ?? ''}
        footer={
          <>
            <Button block onClick={() => close(false)}>
              {dialog?.cancelText ?? 'Hủy'}
            </Button>
            <Button block variant={dialog?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {dialog?.confirmText ?? 'Đồng ý'}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-muted">{dialog?.message}</div>
      </Modal>
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFeedback ngoài FeedbackProvider');
  return c;
}
