import { Children, cloneElement, isValidElement, ReactNode } from 'react';
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
}: StackProps) => {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        {
          flexDirection: direction,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
      {...props}
    >
      {items.map((child, index) => {
        if (!isValidElement(child)) {
          return child;
        }

        const spacingStyle: ViewStyle =
          index === 0
            ? {}
            : direction === 'row'
              ? { marginLeft: gap }
              : { marginTop: gap };

        return cloneElement(child, {
          style: [child.props.style, spacingStyle],
        } as { style: ViewStyle });
      })}
    </View>
  );
};

export const Row = (props: Omit<StackProps, 'direction'>) => (
  <Stack direction="row" {...props} />
);
