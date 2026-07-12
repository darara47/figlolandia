import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Text } from '@/src/components/ui/Text';
import { ValidationCheckRow } from '@/src/debug/components/ValidationCheckRow';
import { useDevToolsStore } from '@/src/debug/store/devtools.store';
import { colors } from '@/src/theme/tokens';
import type { AuditValidationDto } from '@/src/types/audit';

interface ValidationDetailModalProps {
  visible: boolean;
  checks: AuditValidationDto[];
  onClose: () => void;
}

export const ValidationDetailModal = ({
  visible,
  checks,
  onClose,
}: ValidationDetailModalProps) => {
  const density = useDevToolsStore((s) => s.density);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Card style={{ maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text variant="section" style={{ color: colors.text.primary }}>
              Validation Detail
            </Text>
            <Pressable onPress={onClose}>
              <Text variant="label" style={{ color: colors.brand.DEFAULT }}>
                Zamknij
              </Text>
            </Pressable>
          </View>
          <ScrollView>
            {checks.length === 0 ? (
              <Text variant="body" style={{ color: colors.text.secondary }}>
                Brak wyników walidacji
              </Text>
            ) : (
              checks.map((check) => (
                <ValidationCheckRow key={check.id} check={check} density={density} />
              ))
            )}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
};
