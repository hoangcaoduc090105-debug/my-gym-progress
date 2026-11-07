/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        bg: '#0a0d12',
        surface: '#121821',
        surface2: '#1a222e',
        line: '#263142',
        muted: '#8a97a8',
        text: '#e8edf3',
        accent: { DEFAULT: '#c6f432', dim: '#9fc425', ink: '#11160a' },
        info: '#5cc8ff',
        warn: '#ffb547',
        danger: '#ff5d6c',
        ok: '#3ddc97',
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
    },
  },
  plugins: [],
};
