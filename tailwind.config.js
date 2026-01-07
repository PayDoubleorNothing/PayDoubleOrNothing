/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'rotate-coin': 'rotateCoin 3.5s cubic-bezier(0.33, 0.01, 0.25, 1)',
        'pulse-coin': 'pulseCoin 2s ease-in-out',
        'spin-infinite': 'spin 1s linear infinite',
        'pulse-shadow': 'pulseShadow 2s ease-in-out infinite',
      },
      keyframes: {
        rotateCoin: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(1800deg)' },
        },
        pulseCoin: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '25%': { transform: 'scale(1.05)', filter: 'brightness(1.1)' },
          '50%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '75%': { transform: 'scale(1.05)', filter: 'brightness(1.1)' },
        },
        pulseShadow: {
          '0%, 100%': {
            opacity: '0.5',
            transform: 'translateX(-50%) scale(1)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'translateX(-50%) scale(1.1)',
          },
        },
      },
    },
  },
  plugins: [],
}
