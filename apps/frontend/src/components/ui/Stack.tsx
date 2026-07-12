import { ReactNode } from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

interface StackProps extends ViewProps {
  direction?: 'row' | 'column';
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  children: ReactNode;
}

export const Stack = ({
  direction = 'column',
  gap = 12,
  align,
  justify,
  wrap = false,
  style,
  children,
  ...props
}: StackProps) => (
  <View
    style={[
      {
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap,
      },
      style,
    ]}
    {...props}
  >
    {children}
  </View>
);

export const Row = (props: Omit<StackProps, 'direction'>) => (
  <Stack direction="row" {...props} />
);
