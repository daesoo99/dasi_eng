/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 전문가 원칙: Primary/Secondary/Accent만 사용
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // 기능적 색상 유지
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontSize: {
        // 전문가 원칙: 명확한 폰트 계층
        'display': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }], // 40px
        'h1': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],     // 30px  
        'h2': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],       // 24px
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],      // 20px
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],       // 16px
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }], // 14px
        'small': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],   // 12px
      },
      spacing: {
        // 8px 기준 간격 시스템 강화
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
      }
    },
  },
  plugins: [],
}