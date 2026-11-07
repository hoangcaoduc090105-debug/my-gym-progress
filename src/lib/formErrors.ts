import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/** Lỗi theo từng ô: khóa = path của issue nối bằng dấu chấm ('progression.minRIR', 'days.0.exercises.1.repMin'); '' = lỗi chung của form. */
export type FieldErrors = Record<string, string>;

interface IssueLike {
  path: (string | number)[];
  message: string;
}

/** Chuyển lỗi Zod (hoặc bất kỳ object có `issues`) thành map lỗi theo ô; mỗi ô giữ lỗi đầu tiên. */
export function zodIssuesToFieldErrors(error: { issues: IssueLike[] }): FieldErrors {
  const out: FieldErrors = {};
  for (const i of error.issues) {
    const key = i.path.join('.');
    if (!(key in out)) out[key] = i.message;
  }
  return out;
}

export interface FieldErrorsApi {
  errors: FieldErrors;
  /** Đặt lỗi từ kết quả safeParse lỗi và focus ô lỗi đầu tiên. */
  setFromZod: (error: { issues: IssueLike[] }) => void;
  clear: (field: string) => void;
  clearAll: () => void;
  /** Gắn vào phần tử bao form để tìm ô lỗi đầu tiên mà focus. */
  containerRef: React.RefObject<HTMLElement>;
}

export function useFieldErrors(): FieldErrorsApi {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focusTick, setFocusTick] = useState(0);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!focusTick) return;
    const root = containerRef.current ?? document;
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
  }, [focusTick]);

  const setFromZod = useCallback((error: { issues: IssueLike[] }) => {
    setErrors(zodIssuesToFieldErrors(error));
    setFocusTick((t) => t + 1);
  }, []);
  const clear = useCallback((field: string) => {
    setErrors((e) => {
      if (!(field in e) && !('' in e)) return e;
      const n = { ...e };
      delete n[field];
      delete n[''];
      return n;
    });
  }, []);
  const clearAll = useCallback(() => setErrors({}), []);
  return useMemo(() => ({ errors, setFromZod, clear, clearAll, containerRef }), [errors, setFromZod, clear, clearAll]);
}

/** Context để Field tự lấy lỗi theo `name` và tự xóa lỗi khi người dùng sửa. */
export const FieldErrorsContext = createContext<FieldErrorsApi | null>(null);
export const useFieldErrorsContext = () => useContext(FieldErrorsContext);
