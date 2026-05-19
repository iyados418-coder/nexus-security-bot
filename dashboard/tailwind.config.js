/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF0000',
        secondary: '#1a1a2e',
        dark: '#0a0a0f',
        card: '#12121a',
        accent: '#ff1a1a',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 0, 0, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
