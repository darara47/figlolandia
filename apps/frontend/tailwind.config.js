/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0B1220',
          elevated: '#141F35',
          hover: '#1B2947',
        },
        border: {
          DEFAULT: '#28345A',
          subtle: '#1E2A4A',
        },
        text: {
          primary: '#F4F6FB',
          secondary: '#8D9AC0',
          tertiary: '#57628A',
        },
        brand: {
          DEFAULT: '#FF7A45',
          hover: '#FF9066',
          muted: '#3D2A22',
        },
        gold: {
          DEFAULT: '#FFC94D',
          glow: '#FFE29A',
        },
        success: '#34D399',
        danger: '#FF4D6D',
        warning: '#FFB020',
        category: {
          education: '#4C8DFF',
          health: '#FF5C72',
          finance: '#F0B429',
          administration: '#A66BFF',
          entertainment: '#2DD4BF',
        },
        severity: {
          info: '#4C8DFF',
          warning: '#FFB020',
          error: '#FF4D6D',
          critical: '#C81E4A',
        },
        verify: {
          ok: '#34D399',
          mismatch: '#FF4D6D',
        },
      },
      fontFamily: {
        display: ['Baloo2_700Bold', 'System'],
        body: ['PlusJakartaSans_500Medium', 'System'],
        bodyBold: ['PlusJakartaSans_700Bold', 'System'],
      },
      borderRadius: {
        card: '16px',
        chip: '10px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.35)',
        glow: '0 0 20px rgba(255,122,69,0.35)',
      },
    },
  },
  plugins: [],
};
