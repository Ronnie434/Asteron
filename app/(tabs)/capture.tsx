import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  AppState,
  AppStateStatus,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Typography } from '../../src/ui/components/Typography';
import { ChatInputBar } from '../../src/ui/components/ChatInputBar';
import { ChatMessage } from '../../src/ui/components/ChatMessage';
import { useChatStore } from '../../src/store/useChatStore';
import { useItemsStore } from '../../src/store/useItemsStore';
import { aiService } from '../../src/ai/aiService';
import { RainbowSparkles } from '../../src/ui/components/RainbowSparkles';
import { LiveSparkles } from '../../src/ui/components/LiveSparkles';
import { AddTaskModal } from '../../src/ui/components/AddTaskModal';
import { ChevronLeft } from 'lucide-react-native';
import type { Item } from '../../src/db/items';

interface CaptureScreenProps {
  onClose?: () => void;
}

export default function CaptureScreen({ onClose }: CaptureScreenProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Chat store
  const messages = useChatStore(state => state.messages);
  const isProcessing = useChatStore(state => state.isProcessing);
  const addUserMessage = useChatStore(state => state.addUserMessage);
  const addAssistantMessage = useChatStore(state => state.addAssistantMessage);
  const setProcessing = useChatStore(state => state.setProcessing);
  const clearSession = useChatStore(state => state.clearSession);
  
  // Items store
  const items = useItemsStore(state => state.items);
  const addItem = useItemsStore(state => state.addItem);
  const updateItem = useItemsStore(state => state.updateItem);
  const deleteItem = useItemsStore(state => state.deleteItem);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Add Task Modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Handle app state changes to clear session when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        clearSession();
      }
    });
    
    return () => subscription.remove();
  }, [clearSession]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Handle sending a message
  const handleSend = useCallback(async (text: string) => {
    // Add user message to chat
    addUserMessage(text);
    setProcessing(true);

    try {
      // Prepare existing items for context
      const existingItems = items
        .filter(i => i.status === 'active')
        .map(i => ({ id: i.id, title: i.title, type: i.type }));

      // Analyze intent
      const result = await aiService.analyzeIntent(text, existingItems);

      // Handle based on intent
      switch (result.intent) {
        case 'create': {
          if (result.itemData) {
            await addItem(result.itemData.title, {
              type: result.itemData.type,
              priority: result.itemData.priority,
              details: result.itemData.details,
              dueAt: result.itemData.dueAt,
              remindAt: result.itemData.remindAt,
              repeat: result.itemData.repeat || 'none',
              repeatConfig: result.itemData.repeatConfig || null,
              status: 'active',
              confidence: result.confidence,
            });
            
            addAssistantMessage(result.responseText, {
              type: 'created',
              itemType: result.itemData.type,
              itemId: '', // We don't have access to the new ID here
              itemTitle: result.itemData.title,
            });
          } else {
            addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'update': {
          if (result.searchQuery && result.updates) {
            // Find matching item
            const matchingItem = findMatchingItem(items, result.searchQuery);
            
            if (matchingItem) {
              await updateItem(matchingItem.id, result.updates);
              
              addAssistantMessage(result.responseText, {
                type: 'updated',
                itemType: matchingItem.type,
                itemId: matchingItem.id,
                itemTitle: matchingItem.title,
              });
            } else {
              addAssistantMessage("I couldn't find that item. Could you be more specific?");
            }
          } else {
            addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'delete': {
          if (result.searchQuery) {
            const matchingItem = findMatchingItem(items, result.searchQuery);
            
            if (matchingItem) {
              await deleteItem(matchingItem.id);
              
              addAssistantMessage(result.responseText, {
                type: 'deleted',
                itemType: matchingItem.type,
                itemId: matchingItem.id,
                itemTitle: matchingItem.title,
              });
            } else {
              addAssistantMessage("I couldn't find that item. Could you be more specific?");
            }
          } else {
            addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'query': {
          // For now, just respond with the AI's response
          addAssistantMessage(result.responseText);
          break;
        }

        case 'chat':
        default:
          addAssistantMessage(result.responseText);
          break;
      }
    } catch (error) {
      console.error('Failed to process message:', error);
      addAssistantMessage("Sorry, something went wrong. Please try again.");
    } finally {
        // Ensure processing is turned off if it wasn't already by addAssistantMessage (which updates store but we might want to be safe)
        // Store updates handle this, but good to keep in mind.
    }
  }, [items, addUserMessage, addItem, updateItem, deleteItem, addAssistantMessage, setProcessing]);

  // Start Recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permission to use voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  // Stop and Process Recording
  const stopAndSendRecording = async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setProcessing(true); // Show processing UI immediately

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        // Transcribe
        const text = await aiService.transcribeAudio(uri);
        // Process text
        await handleSend(text);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to process audio.');
      setProcessing(false);
    } finally {
      recordingRef.current = null;
    }
  };

  // Cancel Recording
  const cancelRecording = async () => {
    if (!recordingRef.current) return;
    
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch (err) {
      console.error('Failed to cancel recording', err);
    } finally {
      recordingRef.current = null;
    }
  };

  // Handle plus button press
  const handlePlusPress = useCallback(() => {
    setShowAddModal(true);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']} // Bottom handled by ChatInputBar
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => onClose ? onClose() : router.back()}
            activeOpacity={0.7}
            style={styles.backButtonTouchable}
          >
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.backButton,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                }
              ]}
            >
              <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
            </BlurView>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <RainbowSparkles size={20} />
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Chat Messages Area - ScrollView fills remaining space */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            // Empty State
            <View style={styles.emptyState}>
              <View style={styles.iconContainer}>
                <LiveSparkles size={64} />
              </View>
              <Typography 
                variant="title1" 
                style={[styles.greeting, { color: colors.text }]}
              >
                {getGreeting()}
              </Typography>
              <Typography 
                variant="body" 
                color={colors.textSecondary}
                style={styles.subtitle}
              >
                What's on your mind?
              </Typography>
              
              {/* Suggested Prompts */}
              <View style={styles.suggestions}>
                <SuggestionChip 
                  text="Create a reminder" 
                  onPress={() => handleSend("I need to set a reminder")}
                />
                <SuggestionChip 
                  text="Add a task" 
                  onPress={() => handleSend("I want to add a task")}
                />
                <SuggestionChip 
                  text="Take a note" 
                  onPress={() => handleSend("I want to take a note")}
                />
              </View>
            </View>
          ) : (
            // Messages List
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          
          {/* Processing Indicator */}
          {isProcessing && (
            <View style={styles.thinkingContainer}>
              <View style={[styles.thinkingBubble, { backgroundColor: isDark ? '#1C1C1E' : '#F0F0F5' }]}>
                <ThinkingDots color={colors.textSecondary} />
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ChatInputBar - OUTSIDE SafeAreaView, handles its own bottom padding */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ChatInputBar
          onSend={handleSend}
          onVoicePress={startRecording}
          onPlusPress={handlePlusPress}
          onCancelRecording={cancelRecording}
          onSendRecording={stopAndSendRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />
      </KeyboardAvoidingView>

      {/* Add Task Modal */}
      <AddTaskModal 
        visible={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </View>
  );
}

// Helper function to find matching item based on search query
function findMatchingItem(items: Item[], searchQuery: string): Item | undefined {
  const query = searchQuery.toLowerCase();
  
  // First try exact match
  const exactMatch = items.find(
    i => i.status === 'active' && i.title.toLowerCase() === query
  );
  if (exactMatch) return exactMatch;
  
  // Then try partial match
  const partialMatch = items.find(
    i => i.status === 'active' && i.title.toLowerCase().includes(query)
  );
  if (partialMatch) return partialMatch;
  
  // Try matching individual words
  const words = query.split(/\s+/);
  return items.find(i => 
    i.status === 'active' && 
    words.some(word => i.title.toLowerCase().includes(word))
  );
}

// Suggestion Chip Component
function SuggestionChip({ text, onPress }: { text: string; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.suggestionChip,
        { 
          backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }
      ]}
    >
      <Typography 
        variant="callout" 
        color={colors.text}
      >
        {text}
      </Typography>
    </TouchableOpacity>
  );
}

// Thinking Dots Animation
function ThinkingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      animate(dot1, 0),
      animate(dot2, 150),
      animate(dot3, 300),
    ];

    animations.forEach(a => a.start());

    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.thinkingDots}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: dot3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  greeting: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  thinkingContainer: {
    marginVertical: 4,
    marginHorizontal: 16,
    alignItems: 'flex-start',
  },
  thinkingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    height: 52,
  },
  backButtonTouchable: {
    width: 40,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 44,
  },
});
