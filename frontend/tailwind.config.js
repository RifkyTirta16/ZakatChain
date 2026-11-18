
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
  colors: {
    primary: { DEFAULT: '#2BA8A2', light: '#3CC4BD', dark: '#1E8C86', bg: '#E8F6F5' },
    gold:    { DEFAULT: '#FFD23F', light: '#FFE47A', dark: '#E6B800' },
    coral:   { DEFAULT: '#EF6C4A', light: '#FF8A6A', dark: '#D45233' },
    cream:   '#FFF8E7',
    sky:     '#5DADE2',
    surface: '#EFF8F7',
    success: '#27AE60',
    danger:  '#E74C3C',
  },
  fontFamily: {
    sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  },
  borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  boxShadow: {
    card: '0 4px 20px rgba(43,168,162,.10)',
    'teal-glow': '0 4px 20px rgba(43,168,162,.30)',
    'gold-glow': '0 4px 20px rgba(255,210,63,.40)',
    'coral-glow': '0 4px 20px rgba(239,108,74,.35)',
    'sky-glow': '0 4px 16px rgba(93,173,226,.30)',
    focus: '0 0 0 4px rgba(43,168,162,.20)',
  },
  transitionTimingFunction: { bounce: 'cubic-bezier(.34,1.56,.64,1)' },
}
  },
  plugins: [],
}
