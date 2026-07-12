import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Play, Pause, SkipForward, Rewind } from 'lucide-react-native';
import { Button } from '@/src/components/ui/Button';
import { Text } from '@/src/components/ui/Text';
import { Row } from '@/src/components/ui/Stack';
import { Card } from '@/src/components/ui/Card';
import { colors } from '@/src/theme/tokens';

export const StepReplayStub = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <View style={{ position: 'relative' }}>
        <Button variant="secondary" size="sm" onPress={() => setVisible(true)}>
          ▶ Step Replay
        </Button>
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            backgroundColor: colors.warning,
            borderRadius: 4,
            paddingHorizontal: 4,
            paddingVertical: 1,
          }}
        >
          <Text variant="label" style={{ fontSize: 8, color: '#000', fontWeight: '700' }}>
            Wkrótce
          </Text>
        </View>
      </View>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={() => setVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <Card>
            <Row justify="space-between" align="center" style={{ marginBottom: 12 }}>
              <Text variant="section" style={{ color: colors.text.primary }}>
                Step Replay
              </Text>
              <View
                style={{
                  backgroundColor: colors.warning,
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text variant="label" style={{ fontSize: 10, color: '#000' }}>
                  Future
                </Text>
              </View>
            </Row>
            <View
              style={{
                height: 4,
                backgroundColor: colors.bg.hover,
                borderRadius: 2,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: '30%',
                  height: 4,
                  backgroundColor: colors.text.tertiary,
                  borderRadius: 2,
                }}
              />
            </View>
            <Row justify="center" gap={16} style={{ marginBottom: 16, opacity: 0.4 }}>
              <Rewind size={20} color={colors.text.secondary} />
              <Play size={24} color={colors.text.secondary} />
              <Pause size={24} color={colors.text.secondary} />
              <SkipForward size={20} color={colors.text.secondary} />
            </Row>
            <Text variant="label" style={{ color: colors.text.tertiary, textAlign: 'center' }}>
              Endpoint /replay nie jest jeszcze dostępny
            </Text>
            <Pressable onPress={() => setVisible(false)} style={{ marginTop: 16 }}>
              <Text variant="label" style={{ color: colors.brand.DEFAULT, textAlign: 'center' }}>
                Zamknij
              </Text>
            </Pressable>
          </Card>
        </View>
      </Modal>
    </>
  );
};
