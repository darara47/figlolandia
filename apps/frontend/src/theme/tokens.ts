export const colors = {
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
} as const;

export const spacing = {
  screen: 16,
  cardGap: 12,
  grid: 4,
} as const;

export const radius = {
  card: 16,
  chip: 10,
  pill: 999,
  narrator: 20,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#FF7A45',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export const fonts = {
  display: 'Baloo2_700Bold',
  body: 'PlusJakartaSans_500Medium',
  bodyBold: 'PlusJakartaSans_700Bold',
} as const;

export const professionGroupColors: Record<string, string> = {
  Ekonomia: colors.category.finance,
  Budowa: colors.category.education,
  Interakcja: colors.category.health,
  'Władza / Obrona': colors.category.administration,
};

export const getPlayerAvatarColor = (playerId: string): string => {
  const palette = [
    colors.category.education,
    colors.category.health,
    colors.category.finance,
    colors.category.administration,
    colors.category.entertainment,
    colors.brand.DEFAULT,
  ];
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};
