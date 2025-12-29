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
  const pendingItem = useChatStore(state => state.pendingItem);
  const startPendingItem = useChatStore(state => state.startPendingItem);
  const completePendingItem = useChatStore(state => state.completePendingItem);
  const cancelPendingItem = useChatStore(state => state.cancelPendingItem);
  
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
  
  // Toast state for save confirmation
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Handle save success from AddTaskModal
  const handleSaveSuccess = useCallback((title: string) => {
    setToastMessage(`✓ Saved "${title}"`);
    
    // Animate toast in
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  }, [toastOpacity]);

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
      // Check if we're in a pending item conversation (answering a follow-up question)
      if (pendingItem && pendingItem.awaitingField) {
        // Process the user's answer to the pending question
        const followUpResult = await aiService.processFollowUpAnswer?.(
          pendingItem.partialData,
          pendingItem.missingFields,
          text
        );

        if (followUpResult) {
          if (followUpResult.complete && followUpResult.updatedData) {
            // All fields gathered, create the item
            const data = followUpResult.updatedData;
            if (data && data.title) {
              await addItem(data.title, {
                type: data.type ?? 'task',
                priority: data.priority ?? 'med',
                details: data.details ?? undefined,
                dueAt: data.dueAt ?? null,
                remindAt: data.remindAt ?? null,
                repeat: data.repeat ?? 'none',
                repeatConfig: data.repeatConfig ?? null,
                status: 'active',
                confidence: 0.9,
              });

              addAssistantMessage(`Perfect! I've added "${data.title}" to your list.`, {
                type: 'created',
                itemType: data.type ?? 'task',
                itemId: '',
                itemTitle: data.title,
              });
            }
            completePendingItem();
          } else if (followUpResult.nextQuestion && followUpResult.updatedData) {
            // More questions to ask
            const nextField = followUpResult.remainingFields[0] || 'details';
            startPendingItem(
              followUpResult.updatedData,
              followUpResult.remainingFields as any,
              followUpResult.nextQuestion,
              nextField
            );
            addAssistantMessage(followUpResult.nextQuestion, undefined, nextField);
          }
        }
        return;
      }

      // Prepare rich context for existing items
      const existingItems = items
        .filter(i => i.status === 'active')
        .map(i => ({ 
          id: i.id, 
          title: i.title, 
          type: i.type,
          priority: i.priority,
          dueAt: i.dueAt,
          remindAt: i.remindAt,
          status: i.status,
        }));

      // Analyze intent
      const result = await aiService.analyzeIntent(text, existingItems);

      // Handle based on intent
      switch (result.intent) {
        case 'create': {
          // Check if AI is asking for clarification
          if (result.needsClarification && result.clarificationQuestion && result.itemData) {
            // Start pending item and ask the question
            const firstMissingField = result.missingFields?.[0] || 'priority';
            startPendingItem(
              result.itemData,
              result.missingFields || [],
              result.clarificationQuestion,
              firstMissingField
            );
            addAssistantMessage(result.clarificationQuestion, undefined, firstMissingField);
          } else if (result.itemData) {
            // Create immediately if no clarification needed
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
              itemId: '',
              itemTitle: result.itemData.title,
            });
          } else {
            addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'batch_create': {
          if (result.items && result.items.length > 0) {
            let successCount = 0;
            for (const item of result.items) {
               await addItem(item.title, {
                type: item.type,
                priority: item.priority,
                details: item.details,
                dueAt: item.dueAt,
                remindAt: item.remindAt,
                repeat: item.repeat || 'none',
                repeatConfig: item.repeatConfig || null,
                status: 'active',
                confidence: result.confidence,
              });
              successCount++;
            }
            addAssistantMessage(result.responseText, {
              type: 'created',
              itemType: result.items[0].type,
              itemId: '',
              itemTitle: `${successCount} items`,
            });
          } else {
             addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'update': {
          // Try matchedItemId first (smart matching), then fall back to searchQuery
          let matchingItem: Item | undefined;
          
          if (result.matchedItemId) {
            matchingItem = items.find(i => i.id === result.matchedItemId);
          }
          
          if (!matchingItem && result.searchQuery) {
            matchingItem = findMatchingItem(items, result.searchQuery);
          }
          
          if (matchingItem && result.updates) {
            await updateItem(matchingItem.id, result.updates);
            
            addAssistantMessage(result.responseText, {
              type: 'updated',
              itemType: matchingItem.type,
              itemId: matchingItem.id,
              itemTitle: matchingItem.title,
            });
          } else if (!matchingItem) {
            addAssistantMessage("I couldn't find that item. Could you be more specific?");
          } else {
            addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'delete': {
          // Try matchedItemId first, then searchQuery
          let matchingItem: Item | undefined;
          
          if (result.matchedItemId) {
            matchingItem = items.find(i => i.id === result.matchedItemId);
          }
          
          if (!matchingItem && result.searchQuery) {
            matchingItem = findMatchingItem(items, result.searchQuery);
          }
          
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
          break;
        }

        case 'query':
        case 'summary':
        case 'suggest': {
          // AI provides data-driven responses
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
      cancelPendingItem(); // Clear pending item on error
    } finally {
        // Ensure processing is turned off if it wasn't already by addAssistantMessage (which updates store but we might want to be safe)
        // Store updates handle this, but good to keep in mind.
    }
  }, [items, pendingItem, addUserMessage, addItem, updateItem, deleteItem, addAssistantMessage, setProcessing, startPendingItem, completePendingItem, cancelPendingItem]);

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
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Toast Confirmation */}
      {toastMessage && (
        <Animated.View 
          style={[
            styles.toast, 
            { 
              backgroundColor: isDark ? 'rgba(45, 45, 50, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              opacity: toastOpacity,
              bottom: insets.bottom + 100,
            }
          ]}
        >
          <View style={styles.toastContent}>
            <View style={[styles.toastIcon, { backgroundColor: colors.primary + '20' }]}>
              <Typography variant="body" style={{ color: colors.primary }}>✓</Typography>
            </View>
            <Typography variant="callout" color={colors.text}>
              {toastMessage.replace('✓ ', '')}
            </Typography>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// Helper function to calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Calculate similarity score between 0 and 1
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

// Helper function to find matching item based on search query with fuzzy matching
function findMatchingItem(items: Item[], searchQuery: string): Item | undefined {
  const query = searchQuery.toLowerCase().trim();
  const activeItems = items.filter(i => i.status === 'active');
  
  if (!query || activeItems.length === 0) return undefined;

  // Score each item
  const scored = activeItems.map(item => {
    const title = item.title.toLowerCase();
    let score = 0;
    
    // Exact match - highest priority
    if (title === query) {
      score = 100;
    }
    // Title contains query
    else if (title.includes(query)) {
      score = 80;
    }
    // Query contains title
    else if (query.includes(title)) {
      score = 70;
    }
    // Fuzzy match using Levenshtein distance
    else {
      const similarity = calculateSimilarity(title, query);
      if (similarity >= 0.6) {
        score = similarity * 60; // Scale to 0-60 range
      }
      
      // Also check word-by-word matching
      const queryWords = query.split(/\s+/).filter(w => w.length > 2);
      const titleWords = title.split(/\s+/);
      
      let wordMatchScore = 0;
      for (const qWord of queryWords) {
        for (const tWord of titleWords) {
          if (tWord.includes(qWord) || qWord.includes(tWord)) {
            wordMatchScore += 15;
          } else {
            const wordSimilarity = calculateSimilarity(qWord, tWord);
            if (wordSimilarity >= 0.7) {
              wordMatchScore += 10;
            }
          }
        }
      }
      score = Math.max(score, wordMatchScore);
    }
    
    // Small boost for more recent items (within last week)
    const createdAt = new Date(item.createdAt);
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      score += (7 - daysSinceCreated) * 0.5; // Up to 3.5 bonus points
    }
    
    return { item, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return best match if score is above threshold
  if (scored.length > 0 && scored[0].score >= 15) {
    return scored[0].item;
  }
  
  return undefined;
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
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
