import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5865F2',
          dark: '#4752C4',
        },
        surface: {
          DEFAULT: '#0b0d12',
          raised: '#12151d',
          border: '#232838',
        },
      },
    },
  },
  plugins: [],
};

export default config;
