import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { NarrativeEvent } from '@/types/websocket';
import {
  getNarrativeEventKey,
  translateNarrativeEvent,
} from '@/src/utils/narrative';

interface NarratorProps {
  events: NarrativeEvent[];
}

interface LogEntry {
  key: string;
  text: string;
}

export const Narrator = ({ events }: NarratorProps) => {
  const [expanded, setExpanded] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [typingText, setTypingText] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const heightAnim = useRef(new Animated.Value(60)).current;
  const displayedKeysRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<NarrativeEvent[]>([]);
  const isTypingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (isTypingRef.current || queueRef.current.length === 0) {
      return;
    }

    const event = queueRef.current.shift();
    if (!event) {
      return;
    }

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

    if (newEvents.length === 0) {
      return;
    }

    queueRef.current.push(...newEvents);
    processQueue();
  }, [events, processQueue]);

  useEffect(() => {
    if (scrollViewRef.current && (logEntries.length > 0 || typingText)) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    const regex = /<b>(.*?)<\/b>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      parts.push(
        <Text key={match.index} style={styles.boldText}>
          {match[1]}
        </Text>,
      );
      currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return <Text style={styles.text}>{parts}</Text>;
  };

  const lastEntry = logEntries[logEntries.length - 1];
  const previewText = typingText || lastEntry?.text || null;
  const eventCount = logEntries.length + (typingText ? 1 : 0);

  return (
    <Animated.View style={[styles.container, { height: heightAnim }]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Narrator</Text>
          {eventCount > 0 && (
            <Text style={styles.eventCount}>{eventCount}</Text>
          )}
        </View>
        <Text style={styles.toggleIcon}>{expanded ? '▼' : '▲'}</Text>
      </Pressable>

      {!expanded && previewText && (
        <View style={styles.preview}>
          {renderText(previewText)}
        </View>
      )}

      {expanded && (
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {logEntries.length === 0 && !typingText ? (
            <Text style={styles.emptyText}>Brak wydarzeń...</Text>
          ) : (
            <>
              {logEntries.map((entry) => (
                <View key={entry.key} style={styles.eventItem}>
                  {renderText(entry.text)}
                </View>
              ))}
              {typingText !== null && (
                <View style={styles.eventItem}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111827',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventCount: {
    color: '#9CA3AF',
    fontSize: 12,
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleIcon: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  preview: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 8,
  },
  eventItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  text: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
