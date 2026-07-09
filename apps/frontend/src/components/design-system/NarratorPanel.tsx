import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { View, ScrollView, Pressable, Animated } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { NarrativeEvent } from '@/types/websocket';
import {
  getNarrativeEventKey,
  translateNarrativeEvent,
} from '@/src/utils/narrative';
import { Text } from '@/src/components/ui/Text';
import { colors, radius } from '@/src/theme/tokens';

interface NarratorPanelProps {
  events: NarrativeEvent[];
}

interface LogEntry {
  key: string;
  text: string;
}

export const NarratorPanel = ({ events }: NarratorPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [typingText, setTypingText] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const heightAnim = useRef(new Animated.Value(72)).current;
  const displayedKeysRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<NarrativeEvent[]>([]);
  const isTypingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (isTypingRef.current || queueRef.current.length === 0) return;

    const event = queueRef.current.shift();
    if (!event) return;

    const key = getNarrativeEventKey(event);
    if (displayedKeysRef.current.has(key)) {
      processQueue();
      return;
    }

    isTypingRef.current = true;
    displayedKeysRef.current.add(key);

    const fullText = translateNarrativeEvent(event);
    let charIndex = 0;
    setTypingText('');

    const typewriterInterval = setInterval(() => {
      charIndex += 1;
      if (charIndex <= fullText.length) {
        setTypingText(fullText.substring(0, charIndex));
      } else {
        clearInterval(typewriterInterval);
        setLogEntries((prev) => [...prev, { key, text: fullText }]);
        setTypingText(null);
        isTypingRef.current = false;
        setTimeout(processQueue, 300);
      }
    }, 30);
  }, []);

  useEffect(() => {
    const queuedKeys = new Set(queueRef.current.map(getNarrativeEventKey));
    const newEvents = events.filter((event) => {
      const key = getNarrativeEventKey(event);
      return !displayedKeysRef.current.has(key) && !queuedKeys.has(key);
    });

    if (newEvents.length === 0) return;

    queueRef.current.push(...newEvents);
    processQueue();
  }, [events, processQueue]);

  useEffect(() => {
    if (scrollViewRef.current && (logEntries.length > 0 || typingText)) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [logEntries, typingText]);

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: expanded ? 220 : 72,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [expanded, heightAnim]);

  const renderText = (text: string) => {
    const parts: (string | ReactNode)[] = [];
    let currentIndex = 0;
    const regex = /<b>(.*?)<\/b>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      parts.push(
        <Text key={match.index} variant="body" className="font-bodyBold text-text-primary">
          {match[1]}
        </Text>,
      );
      currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return (
      <Text variant="body" className="font-display text-base leading-5">
        {parts}
        {typingText === text && (
          <Text variant="body" className="text-brand">
            |
          </Text>
        )}
      </Text>
    );
  };

  const lastEntry = logEntries[logEntries.length - 1];
  const previewText = typingText || lastEntry?.text || null;
  const eventCount = logEntries.length + (typingText ? 1 : 0);

  return (
    <Animated.View
      style={{
        height: heightAnim,
        backgroundColor: colors.brand.muted,
        borderTopLeftRadius: radius.narrator,
        borderTopRightRadius: radius.narrator,
        overflow: 'hidden',
      }}
    >
      <View className="absolute left-0 right-0 top-1.5 items-center">
        <View className="h-1 w-10 rounded-pill bg-border" />
      </View>

      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between px-4 pb-2 pt-4"
      >
        <View className="flex-row items-center gap-2">
          <Megaphone color={colors.brand.DEFAULT} size={18} />
          <Text variant="display" className="text-base">
            Narrator
          </Text>
          {eventCount > 0 && (
            <View className="rounded-pill bg-bg-hover px-2 py-0.5">
              <Text variant="label" className="text-xs">
                {eventCount}
              </Text>
            </View>
          )}
        </View>
        <Text variant="label">{expanded ? '▼' : '▲'}</Text>
      </Pressable>

      {!expanded && previewText && (
        <View className="px-4 pb-2">{renderText(previewText)}</View>
      )}

      {expanded && (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        >
          {logEntries.length === 0 && !typingText ? (
            <Text variant="label" className="italic">
              Brak wydarzeń...
            </Text>
          ) : (
            <>
              {logEntries.map((entry) => (
                <View
                  key={entry.key}
                  className="mb-3 border-b border-border-subtle pb-3"
                >
                  {renderText(entry.text)}
                </View>
              ))}
              {typingText !== null && (
                <View className="mb-3 border-b border-border-subtle pb-3">
                  {renderText(typingText)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
};
