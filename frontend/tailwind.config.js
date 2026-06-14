/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ds: {
          bg:         '#020617',
          surface:    '#0F172A',
          elevated:   '#1E293B',
          border:     '#334155',
          primary:    '#3B82F6',
          'primary-dk': '#1D4ED8',
          violet:     '#6366F1',
          cta:        '#F59E0B',
          text:       '#F8FAFC',
          'text-2':   '#CBD5E1',
          muted:      '#94A3B8',
          disabled:   '#475569',
          success:    '#22C55E',
          error:      '#EF4444',
          warning:    '#F59E0B',
          info:       '#38BDF8',
        },
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'Fira Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['Fira Code', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        'kpi-sm':  ['28px', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'kpi-md':  ['40px', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '700' }],
        'kpi-lg':  ['56px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'kpi-xl':  ['72px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
      },
      boxShadow: {
        'sm-dark':    '0 2px 8px rgba(0,0,0,0.4)',
        'md-dark':    '0 4px 16px rgba(0,0,0,0.5)',
        'lg-dark':    '0 12px 40px rgba(0,0,0,0.55)',
        'xl-dark':    '0 24px 64px rgba(0,0,0,0.6)',
        'glow-blue':  '0 0 32px rgba(59,130,246,0.2)',
        'glow-violet':'0 0 32px rgba(99,102,241,0.15)',
        'glow-amber': '0 0 24px rgba(245,158,11,0.25)',
        'glow-green': '0 0 24px rgba(34,197,94,0.2)',
      },
      borderRadius: {
        'xl':  '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      backgroundImage: {
        'gradient-blue-violet': 'linear-gradient(135deg, #3B82F6, #6366F1)',
        'gradient-green':       'linear-gradient(135deg, #4ADE80, #22C55E)',
        'gradient-amber':       'linear-gradient(135deg, #FCD34D, #F59E0B)',
      },
    },
  },
  plugins: [],
}
