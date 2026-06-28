import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1A1814',
        paper: '#F4F2ED',
        brass: '#C4922F',
        amber: '#D9A441',
        positive: '#3E6B4F',
        critical: '#A23B2D',
        caution: '#8A6A1E',
        muted: '#57534A',
        quiet: '#8A8478',
        rule: '#E4E0D6',
        panel: '#FFFFFF',
        field: '#FBFAF7',
        shell: '#E8E5DD',
        chamber: '#16140F',
      },
      fontFamily: {
        sans: ['Archivo', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Spectral', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
