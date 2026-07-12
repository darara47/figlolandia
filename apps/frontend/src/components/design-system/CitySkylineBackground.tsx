import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/src/theme/tokens';

const silhouettes = [
  { x: 20, w: 28, h: 60 },
  { x: 55, w: 22, h: 45 },
  { x: 82, w: 35, h: 80 },
  { x: 122, w: 24, h: 50 },
  { x: 152, w: 30, h: 70 },
  { x: 188, w: 20, h: 40 },
  { x: 214, w: 38, h: 90 },
  { x: 258, w: 26, h: 55 },
  { x: 290, w: 32, h: 75 },
  { x: 328, w: 22, h: 48 },
];

export const CitySkylineBackground = () => (
  <View
    className="absolute bottom-0 left-0 right-0 opacity-30"
    style={{ pointerEvents: 'none' }}
  >
    <Svg width="100%" height={120} viewBox="0 0 360 120" preserveAspectRatio="xMidYMax slice">
      {silhouettes.map((s, i) => (
        <Rect
          key={i}
          x={s.x}
          y={120 - s.h}
          width={s.w}
          height={s.h}
          rx={3}
          fill={colors.bg.elevated}
          opacity={0.6 + (i % 3) * 0.1}
        />
      ))}
    </Svg>
  </View>
);
