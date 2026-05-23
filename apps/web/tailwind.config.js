/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        aurora: {
          violet: 'hsl(var(--aurora-violet))',
          indigo: 'hsl(var(--aurora-indigo))',
          cyan: 'hsl(var(--aurora-cyan))',
          mint: 'hsl(var(--aurora-mint))',
          pink: 'hsl(var(--aurora-pink))',
          amber: 'hsl(var(--aurora-amber))',
          rose: 'hsl(var(--aurora-rose))',
        },
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-bg))',
          fg: 'hsl(var(--sidebar-fg))',
          muted: 'hsl(var(--sidebar-muted))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Be Vietnam Pro', 'ui-sans-serif', 'system-ui'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      backgroundImage: {
        aurora:
          'linear-gradient(135deg, hsl(var(--aurora-violet)) 0%, hsl(var(--aurora-cyan)) 50%, hsl(var(--aurora-pink)) 100%)',
        'aurora-soft':
          'linear-gradient(135deg, hsl(var(--aurora-violet)/.18) 0%, hsl(var(--aurora-cyan)/.12) 50%, hsl(var(--aurora-pink)/.18) 100%)',
        mesh:
          'radial-gradient(at 10% 0%,  hsl(var(--aurora-violet)/.18) 0px, transparent 50%), radial-gradient(at 90% 0%, hsl(var(--aurora-cyan)/.14) 0px, transparent 50%), radial-gradient(at 50% 100%, hsl(var(--aurora-pink)/.12) 0px, transparent 50%)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,16,25,.04), 0 4px 16px rgba(16,16,25,.04)',
        pop: '0 8px 28px -8px hsl(var(--aurora-violet)/.35)',
        glass: 'inset 0 1px 0 rgba(255,255,255,.08), 0 8px 32px rgba(8,8,15,.45)',
        lift: '0 10px 30px -10px hsl(var(--aurora-violet)/.18), 0 4px 14px hsl(var(--aurora-cyan)/.10)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
