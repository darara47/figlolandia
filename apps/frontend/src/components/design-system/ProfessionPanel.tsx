import { View, ViewProps } from 'react-native';
import { PROFESSION_DATA } from '@figlolandia/game-core';
import { Text } from '@/src/components/ui/Text';
import { professionGroupColors } from '@/src/theme/tokens';
import { cn } from '@/src/utils/cn';

interface ProfessionPanelProps extends ViewProps {
  profession: string;
  children?: React.ReactNode;
  className?: string;
}

export const ProfessionPanel = ({
  profession,
  children,
  className,
  ...props
}: ProfessionPanelProps) => {
  const professionData = PROFESSION_DATA[profession as keyof typeof PROFESSION_DATA];
  const groupColor =
    professionGroupColors[professionData?.category ?? ''] ?? professionGroupColors.Ekonomia;

  return (
    <View
      className={cn(
        'flex-row overflow-hidden rounded-card border border-border bg-bg-elevated',
        className,
      )}
      {...props}
    >
      <View className="w-1.5" style={{ backgroundColor: groupColor }} />
      <View className="flex-1 p-4">
        {professionData && (
          <View className="mb-3">
            <Text variant="section">{professionData.category}</Text>
            <Text variant="display" className="text-lg">
              {professionData.name}
            </Text>
          </View>
        )}
        {children}
      </View>
    </View>
  );
};
