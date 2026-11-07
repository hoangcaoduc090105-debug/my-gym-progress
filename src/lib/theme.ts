import { useEffect, useState } from 'react';

/** Giao diện Sáng/Tối/Theo máy — lưu trên thiết bị (localStorage), mặc định Sáng. */
export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
const KEY = 'mgp.theme';
const EVT = 'mgp-theme';
const META: Record<ResolvedTheme, string> = { light: '#f3f7f6', dark: '#0a0d12' };

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* bộ nhớ tạm không khả dụng */
  }
  return 'light';
}

export function resolveTheme(p: ThemePref): ResolvedTheme {
  if (p !== 'system') return p;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(p: ThemePref = getThemePref()): ResolvedTheme {
  const r = resolveTheme(p);
  document.documentElement.dataset.theme = r;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[r]);
  window.dispatchEvent(new CustomEvent(EVT, { detail: r }));
  return r;
}

export function setThemePref(p: ThemePref): void {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* bỏ qua */
  }
  applyTheme(p);
}

/** Theo dõi thay đổi giao diện của hệ điều hành khi người dùng chọn "Theo máy". */
export function watchSystemTheme(): void {
  if (typeof matchMedia === 'undefined') return;
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system');
  });
}

export function useResolvedTheme(): ResolvedTheme {
  const [t, setT] = useState<ResolvedTheme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    const on = (e: Event) => setT((e as CustomEvent<ResolvedTheme>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return t;
}
