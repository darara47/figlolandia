import * as Clipboard from 'expo-clipboard';
import { Pressable } from 'react-native';
import { Copy } from 'lucide-react-native';
import { useDevToolsStore } from '@/src/debug/store/devtools.store';
import { colors } from '@/src/theme/tokens';

interface CopyButtonProps {
  value: string;
  size?: number;
}

export const CopyButton = ({ value, size = 14 }: CopyButtonProps) => {
  const showToast = useDevToolsStore((s) => s.showToast);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    showToast('Skopiowano do schowka');
  };

  return (
    <Pressable onPress={handleCopy} hitSlop={8} accessibilityLabel="Kopiuj">
      <Copy size={size} color={colors.text.tertiary} />
    </Pressable>
  );
};
