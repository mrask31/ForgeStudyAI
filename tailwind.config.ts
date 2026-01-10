import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			// Clinical Light Theme Colors
  			clinical: {
  				bg: '#F7F9FB',        // Soft off-white background
  				card: '#FFFFFF',      // Pure white cards
  				border: '#E5EAF0',    // Subtle gray borders
  				primary: '#2F6FED',   // Medical Confidence Blue
  				secondary: '#5FA8D3', // Calm Supportive Blue
  				text: {
  					primary: '#1F2933',   // Primary text
  					secondary: '#4A5568', // Secondary text
  				},
  				accent: {
  					blue: '#E8F1FD',      // Soft blue background for active states
  					green: '#E6F7F0',     // Soft green for success/active indicators
  				},
  				message: {
  					ai: '#F0F6FF',        // Light blue tint for AI bubbles
  					user: '#F4F6F8',      // Neutral gray for user bubbles
  				},
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  		},
  		lineHeight: {
  			'relaxed': '1.6',
  			'comfortable': '1.7',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		padding: {
  			'safe-b': 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
  			'safe-t': 'env(safe-area-inset-top, 0px)',
  			'safe-l': 'env(safe-area-inset-left, 0px)',
  			'safe-r': 'env(safe-area-inset-right, 0px)',
  		},
  		margin: {
  			'safe-b': 'env(safe-area-inset-bottom, 0px)',
  			'safe-t': 'env(safe-area-inset-top, 0px)',
  		},
  		height: {
  			'screen-dynamic': '100dvh',
  		},
  		minHeight: {
  			'screen-dynamic': '100dvh',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
