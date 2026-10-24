import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          dark: '#0a0d14',
          card: '#121722',
          border: '#1f2738',
          accent: '#10b981',
          gold: '#f59e0b',
          rose: '#f43f5e',
          cyan: '#06b6d4',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
