/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f3f5fb', 100: '#e4e8f5', 200: '#c8d0ea', 700: '#232d63', 800: '#1a2250', 900: '#111736', 950: '#0b0f26' },
        brand: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(17,23,54,.05), 0 4px 16px rgba(17,23,54,.06)' },
    },
  },
  plugins: [],
}
