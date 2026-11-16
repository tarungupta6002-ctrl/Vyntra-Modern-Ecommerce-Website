import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFD814', // Amazon Yellow
          hover: '#F7CA00',
          container: '#232F3E', // Navy secondary
          fixed: '#FEF8E7',
          'fixed-dim': '#FCD200',
          'on-fixed': '#0F1111',
        },
        'buy-now': {
          DEFAULT: '#FF9900', // Amazon Orange
          hover: '#FA8900',
        },
        accent: {
          DEFAULT: '#007185', // Teal
          hover: '#004B57',
          light: '#E7F4F5',
        },
        header: {
          main: '#131921', // Dark Navy
          nav: '#232F3E', // Navy Gray
          search: '#FFFFFF',
          text: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FF9900',
          container: '#FA8900',
          coral: '#FF6B4A',
          fixed: '#FFE4B5',
          'fixed-dim': '#FFD814',
        },
        tertiary: {
          DEFAULT: '#007185',
          container: '#067D62',
          mint: '#DDF7E8',
          fixed: '#CFE9DA',
          'fixed-dim': '#B3CCBE',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dim: '#EAEDED',
          bright: '#FFFFFF',
          variant: '#F7F8F8',
          container: {
            lowest: '#FFFFFF',
            low: '#F7F8F8',
            DEFAULT: '#EAEDED',
            high: '#E3E6E6',
            highest: '#D5D9D9',
          },
        },
        'on-surface': {
          DEFAULT: '#0F1111',
          charcoal: '#0F1111',
          variant: '#565959',
          muted: '#767676',
        },
        outline: {
          DEFAULT: '#D5D9D9',
          variant: '#E3E6E6',
          hairline: '#EEEEEE',
        },
        success: {
          DEFAULT: '#067D62',
          container: '#DDF7E8',
        },
        error: {
          DEFAULT: '#B12704',
          container: '#FFDAD6',
        },
      },
      fontFamily: {
        sans: ['"Amazon Ember"', 'Arial', 'sans-serif'],
        display: ['"Amazon Ember"', 'Arial', 'sans-serif'],
        headline: ['"Amazon Ember"', 'Arial', 'sans-serif'],
        body: ['"Amazon Ember"', 'Arial', 'sans-serif'],
        mono: ['"Amazon Ember"', 'Arial', 'sans-serif'],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        gutter: '1.5rem',
        'gutter-mobile': '0.75rem',
        margin: '2.5rem',
        'margin-mobile': '1rem',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        'level-1': '0 2px 6px -1px rgba(25, 25, 25, 0.04), 0 1px 3px -1px rgba(25, 25, 25, 0.03)',
        'level-2': '0 10px 24px -4px rgba(109, 74, 255, 0.08), 0 4px 10px -2px rgba(25, 25, 25, 0.04)',
        'level-3': '0 16px 32px -6px rgba(25, 25, 25, 0.08), 0 6px 14px -3px rgba(25, 25, 25, 0.05)',
        'level-4': '0 24px 48px -12px rgba(25, 25, 25, 0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
