/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#047857',
          light: '#059669',
          dark: '#064E3B',
          deep: '#022C22',
          bg: '#ECFDF5',
        },
        emeraldBrand: {
          DEFAULT: '#047857',
          deep: '#064E3B',
          dark: '#022C22',
          mint: '#ECFDF5',
        },
        forest: {
          DEFAULT: '#064E3B',
          dark: '#022C22',
        },
        gold: {
          DEFAULT: '#C9A45C',
          light: '#DFC184',
          dark: '#A6833E',
        },
        coral: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#991B1B',
        },
        cream: '#F8F7F2',
        mint: '#ECFDF5',
        slateText: '#334155',
        sky: '#0284C7',
        surface: '#F8F7F2',
        success: '#047857',
        danger: '#DC2626',
        wattvision: {
          bg: '#121212',
          surface: '#1E1E1E',
          primary: '#00E5FF',
          alert: '#FF453A',
          success: '#32D74B',
          textMain: '#FFFFFF',
          textSecondary: '#98989D',
          border: '#2C2C2E',
          alertBg: '#3A1C1C',
          hover: '#252525',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Naskh Arabic"', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular'],
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(2,44,34,0.06), 0 8px 24px -4px rgba(2,44,34,0.05)',
        elevated: '0 10px 30px -5px rgba(2,44,34,0.10)',
        'teal-glow': '0 4px 14px rgba(4,120,87,0.20)',
        'gold-glow': '0 4px 14px rgba(201,164,92,0.28)',
        'coral-glow': '0 4px 14px rgba(220,38,38,0.18)',
        'sky-glow': '0 4px 14px rgba(2,132,199,0.20)',
        focus: '0 0 0 3px rgba(4,120,87,0.22)',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
  plugins: [],
};
