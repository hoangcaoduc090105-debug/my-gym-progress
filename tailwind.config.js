/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Màu lấy từ biến CSS (src/index.css) để đổi Sáng/Tối không cần sửa component.
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface2'),
        line: v('line'),
        muted: v('muted'),
        text: v('text'),
        accent: { DEFAULT: v('accent'), dim: v('accent-dim'), ink: v('accent-ink') },
        brand2: { DEFAULT: v('brand2'), text: v('brand2-text') },
        info: v('info'),
        warn: v('warn'),
        danger: v('danger'),
        ok: v('ok'),
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
