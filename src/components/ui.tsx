import { cloneElement, forwardRef, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFieldErrorsContext } from '../lib/formErrors';
import { ChevronDown, ChevronLeft, EllipsisVertical, Info, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { parseNumber } from '../lib/format';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'hero';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-dim font-semibold',
  /** Nút đặt trên thẻ .hero (nền gradient xanh): nền trắng, chữ xanh đậm cố định để đọc được ở cả giao diện sáng lẫn tối. */
  hero: 'bg-white text-[#005e68] hover:bg-white/90 font-semibold',
  secondary: 'bg-surface2 text-text hover:bg-line',
  ghost: 'bg-transparent text-text hover:bg-surface2',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 font-medium',
  outline: 'border border-line text-text hover:bg-surface2',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; block?: boolean }
>(function Button({ variant = 'secondary', size = 'md', icon, block, className, children, type = 'button', ...rest }, ref) {
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4', lg: 'h-14 px-5 text-lg' };
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none select-none',
        VARIANTS[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }>(function IconButton(
  { label, children, className, variant = 'ghost', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40', VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
});

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/**
 * Menu thao tác phụ (nút ⋯): gom các nút ít dùng để đầu thẻ không chật trên điện thoại.
 * - Nút mở: aria-haspopup="menu", aria-expanded; danh sách role="menu", mục role="menuitem", mục tắt aria-disabled.
 * - Mở => focus mục đầu; ↑/↓ xoay vòng, Home/End, Esc hoặc Tab đóng và trả focus về nút; bấm ngoài đóng.
 */
export function Menu({ label, items, className }: { label: string; items: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const first = list.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    first?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!els.length) return;
      const n = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
      els[n]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      (e.key === 'Home' ? els[0] : els[els.length - 1])?.focus();
    }
  };
  return (
    <div className={cx('relative shrink-0', className)}>
      <IconButton ref={btn} label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)}>
        <EllipsisVertical size={20} />
      </IconButton>
      {open && (
        <div
          ref={list}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-2xl"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={it.disabled || undefined}
              onClick={() => {
                if (it.disabled) return;
                close(true);
                it.onSelect();
              }}
              className={cx(
                'flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm',
                it.disabled ? 'cursor-not-allowed opacity-40' : it.danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-surface2',
              )}
            >
              {it.icon && <span className="shrink-0 text-muted">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className, title, action, id }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cx('rounded-2xl border border-line/70 bg-surface p-4 shadow-card', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, back, action, onBack }: { title: string; subtitle?: ReactNode; back?: string | true; action?: ReactNode; onBack?: () => void }) {
  const nav = useNavigate();
  return (
    <header className="mb-4 flex items-start gap-2">
      {back && (
        <IconButton label="Quay lại" onClick={() => (onBack ? onBack() : back === true ? nav(-1) : nav(back))} className="-ml-2">
          <ChevronLeft size={22} />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}

export function Stat({ label, value, unit, hint, tone }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode; tone?: 'ok' | 'warn' | 'danger' | 'accent' }) {
  const toneCls = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-text';
  return (
    <div className="rounded-2xl border border-line/70 bg-surface p-3.5 shadow-card">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cx('mt-1 text-2xl font-bold tabular', toneCls)}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'muted', className }: { children: ReactNode; tone?: 'muted' | 'accent' | 'warn' | 'info' | 'ok' | 'danger'; className?: string }) {
  const t = {
    muted: 'bg-surface2 text-muted',
    accent: 'bg-accent/15 text-accent',
    warn: 'bg-warn/15 text-warn',
    info: 'bg-info/15 text-info',
    ok: 'bg-ok/15 text-ok',
    danger: 'bg-danger/15 text-danger',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', t, className)}>{children}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line p-6 text-center">
      {icon && <div className="mb-2 text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface FieldA11y {
  invalid: boolean;
  /** id của dòng lỗi (khi có lỗi) — gắn vào aria-describedby của ô nhập. */
  describedBy: string | undefined;
}

/**
 * Nhãn + ô nhập + dòng gợi ý/lỗi.
 * - `error` hiển thị trực tiếp; hoặc `name` để lấy lỗi từ FieldErrorsContext (useFieldErrors) và tự xóa lỗi khi người dùng sửa ô.
 * - Có lỗi: ô con được gắn aria-invalid + aria-describedby (trỏ tới dòng lỗi role="alert"); các thuộc tính này cũng truyền qua tham số thứ hai.
 */
export function Field({
  label,
  hint,
  error,
  name,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  name?: string;
  children: (id: string, a11y: FieldA11y) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const ctx = useFieldErrorsContext();
  const err = error ?? (name != null ? ctx?.errors[name] : undefined) ?? null;
  const errId = `${id}-err`;
  const a11y: FieldA11y = { invalid: !!err, describedBy: err ? errId : undefined };
  let child = children(id, a11y);
  if (err && isValidElement(child)) {
    child = cloneElement(child as React.ReactElement<Record<string, unknown>>, { 'aria-invalid': true, 'aria-describedby': errId });
  }
  // Xóa lỗi khi người dùng sửa ô. Gắn ở pha BUBBLE và luôn gắn (không bật/tắt theo lỗi):
  // handler ở pha capture chạy trong listener capture của React; với thao tác gõ thật, trình duyệt chạy
  // microtask trước listener bubble → React render lại ô controlled với giá trị cũ, onChange của ô không
  // bao giờ chạy và ký tự đầu bị nuốt (lỗi v1.7.0). Ở pha bubble, onChange của ô chạy TRƯỚC (ô là đích),
  // cùng một lượt cập nhật với việc xóa lỗi.
  const errRef = useRef(err);
  errRef.current = err;
  const onEdit = () => {
    if (name != null && ctx && errRef.current) ctx.clear(name);
  };
  return (
    <div className={cx('flex flex-col gap-1', className)} onChange={onEdit} onInput={onEdit}>
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {child}
      {hint && !err && <div className="text-xs text-muted">{hint}</div>}
      {err && (
        <div id={errId} role="alert" className="text-xs font-medium text-danger">
          {err}
        </div>
      )}
    </div>
  );
}

/** Lỗi chung của form (path rỗng), ví dụ "Cần nhập ít nhất một chỉ số". */
export function FormError() {
  const ctx = useFieldErrorsContext();
  const err = ctx?.errors[''];
  if (!err) return null;
  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
      {err}
    </div>
  );
}

/**
 * Ô nhập số: giữ chuỗi người dùng gõ, chấp nhận dấu phẩy thập phân và dấu chấm phân cách nghìn ("1.200").
 * Giá trị ngoài [min, max] hoặc không đọc được => ô được đánh dấu lỗi (aria-invalid) và cha nhận null,
 * để màn hình không bao giờ hiển thị một số trong khi dữ liệu lưu là số khác.
 */
/** Số → chữ trong ô nhập theo thói quen Việt: dấu phẩy thập phân (88.2 → "88,2"), không phân cách nghìn. */
export function numberToInputText(value: number | null | undefined): string {
  return value == null ? '' : String(value).replace('.', ',');
}

export function NumberInput({
  value,
  onChange,
  step,
  min,
  max,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(numberToInputText(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    // Ô đang báo lỗi và cha giữ null: giữ nguyên chữ đã gõ để người dùng sửa.
    if (invalid && value == null) return;
    const parsed = text.trim() === '' ? null : parseNumber(text);
    if (parsed !== (value ?? null)) {
      setText(numberToInputText(value));
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="done"
      aria-invalid={invalid || undefined}
      className={cx('w-full tabular', invalid && '!border-danger', className)}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,-]/g, '');
        setText(t);
        if (t.trim() === '') {
          setInvalid(false);
          return onChange(null);
        }
        const n = parseNumber(t);
        const ok = n != null && (min == null || n >= min) && (max == null || n <= max);
        setInvalid(!ok);
        onChange(ok ? n : null);
      }}
      step={step}
      {...rest}
    />
  );
}

/** Phím ←/→/Home/End chuyển tab trong role="tablist" (focus đi theo, kích hoạt luôn). */
function useTablistKeys<T extends string>(values: T[], value: T, onChange: (v: T) => void) {
  return (e: React.KeyboardEvent<HTMLElement>) => {
    const i = values.indexOf(value);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % values.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + values.length) % values.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = values.length - 1;
    if (n < 0) return;
    e.preventDefault();
    const next = values[n];
    if (next === undefined) return;
    onChange(next);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus();
  };
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  const onKeyDown = useTablistKeys(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div role="tablist" onKeyDown={onKeyDown} className={cx('inline-flex rounded-xl bg-surface2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors',
            value === o.value ? 'bg-surface text-text shadow' : 'text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string }[] }) {
  const onKeyDown = useTablistKeys(
    tabs.map((t) => t.value),
    value,
    onChange,
  );
  return (
    <div role="tablist" onKeyDown={onKeyDown} className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-line px-4">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          tabIndex={value === t.value ? 0 : -1}
          onClick={() => onChange(t.value)}
          className={cx(
            'h-11 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors',
            value === t.value ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true');
}

/**
 * Hộp thoại: render vào document.body (portal), nền phía sau được đặt `inert` + `aria-hidden`,
 * focus vào phần tử đầu tiên của nội dung (không có thì nút Đóng), Tab/Shift+Tab xoay vòng trong hộp thoại,
 * Esc đóng hộp thoại trên cùng, đóng xong trả focus về phần tử đã mở.
 */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const host = useRef<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  if (open && !host.current && typeof document !== 'undefined') host.current = document.createElement('div');

  useLayoutEffect(() => {
    const el = host.current;
    if (!open || !el) return;
    const opener = document.activeElement as HTMLElement | null;
    document.body.appendChild(el);
    // Nền phía sau: inert + aria-hidden (giữ nguyên giá trị cũ để trả lại khi đóng — hỗ trợ hộp thoại lồng nhau).
    const changed: { node: Element; inert: boolean; hidden: string | null }[] = [];
    for (const node of Array.from(document.body.children)) {
      // Vùng thông báo (toast) vẫn phải đọc được khi hộp thoại mở.
      if (node === el || node.tagName === 'SCRIPT' || node.hasAttribute('data-live-region')) continue;
      changed.push({ node, inert: node.hasAttribute('inert'), hidden: node.getAttribute('aria-hidden') });
      node.setAttribute('inert', '');
      node.setAttribute('aria-hidden', 'true');
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = (body.current && focusables(body.current)[0]) || (panel.current && focusables(panel.current).find((x) => x !== closeBtn.current)) || closeBtn.current;
    first?.focus();
    return () => {
      for (const c of changed) {
        if (!c.inert) c.node.removeAttribute('inert');
        if (c.hidden == null) c.node.removeAttribute('aria-hidden');
        else c.node.setAttribute('aria-hidden', c.hidden);
      }
      document.body.style.overflow = prevOverflow;
      el.remove();
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
  }, [open]);

  if (!open || !host.current) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Sự kiện React đi qua cây component kể cả portal: chặn để hộp thoại cha không xử lý lại.
    if (e.key === 'Escape' || e.key === 'Tab') e.stopPropagation();
    if (e.key === 'Escape') {
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const list = focusables(panel.current);
    if (list.length === 0) {
      e.preventDefault();
      return;
    }
    const firstEl = list[0]!;
    const lastEl = list[list.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === firstEl || !panel.current.contains(active))) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && (active === lastEl || !panel.current.contains(active))) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="font-semibold">{title}</h2>
          <IconButton ref={closeBtn} label="Đóng" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div ref={body} className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
        {footer && <div className="flex gap-2 border-t border-line p-3 pb-safe">{footer}</div>}
      </div>
    </div>,
    host.current,
  );
}

/** Khối "Cách tính" mở/đóng cho mọi chỉ số. */
export function Explain({ children, title = 'Cách tính' }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-xs font-medium text-info" aria-expanded={open}>
        <Info size={14} /> {title}
        <ChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-2 space-y-1.5 rounded-xl bg-surface2 p-3 text-xs leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function Insufficient({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">{children}</div>;
}

export function LinkRow({ to, children, right }: { to: string; children: ReactNode; right?: ReactNode }) {
  return (
    <Link to={to} className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-surface2">
      <div className="min-w-0 flex-1">{children}</div>
      {right}
    </Link>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Spinner() {
  return <div className="flex justify-center p-8 text-sm text-muted">Đang tải…</div>;
}
