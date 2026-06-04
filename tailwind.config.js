/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Studio surface palette (slate-charcoal with an electric accent)
        ink: {
          900: '#0b0d12',
          800: '#11141b',
          700: '#171b24',
          600: '#1e232e',
          500: '#272d3a',
          400: '#39414f',
          300: '#525b6b',
        },
        accent: {
          DEFAULT: '#5b8cff',
          soft: '#7aa2ff',
          dim: '#3a5bbf',
        },
        signal: {
          green: '#36d399',
          amber: '#fbbd23',
          red: '#f87272',
        },
      },
      fontFamily: {
        sans: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)',
        float: '0 20px 60px -20px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
