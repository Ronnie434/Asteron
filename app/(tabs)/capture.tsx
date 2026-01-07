import { useRef, useState, useEffect, useCallback } from 'react';
import { safeParseDate, formatLocalDate, getTodayLocalDate } from '../../src/utils/dateUtils';
import { View, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard, Alert, TextInput, Dimensions, Animated, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { X, Mic, ChevronRight, Info, Trash2 } from 'lucide-react-native';
import { GlassyHeader } from '../../src/ui/components/GlassyHeader';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Typography } from '../../src/ui/components/Typography';
import { ChatMessage } from '../../src/ui/components/ChatMessage';
import { RainbowSparkles } from '../../src/ui/components/RainbowSparkles';
import { LiveSparkles } from '../../src/ui/components/LiveSparkles';
import { useChatStore } from '../../src/store/useChatStore';
import { useItemsStore } from '../../src/store/useItemsStore';
import { aiService } from '../../src/ai/aiService';
import { HelpModal } from '../../src/ui/components/HelpModal';
import { AddTaskModal } from '../../src/ui/components/AddTaskModal';
import { ChatInputBar } from '../../src/ui/components/ChatInputBar';
import type { Item } from '../../src/db/items';
import { expandRepeatingItems, sortItemsByTimeAndStatus } from '../../src/utils/repeatExpansion';
import { buildFullContext } from '../../src/utils/contextBuilder';
import { useResponsive } from '../../src/ui/useResponsive';

interface CaptureScreenProps {
  onClose?: () => void;
}

export default function CaptureScreen({ onClose }: CaptureScreenProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isDesktop, contentWidth } = useResponsive();
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
  // Pending action for delete confirmation
  const pendingAction = useChatStore(state => state.pendingAction);
  const startPendingAction = useChatStore(state => state.startPendingAction);
  const clearPendingAction = useChatStore(state => state.clearPendingAction);
  
  // Items store
  const items = useItemsStore(state => state.items);
  const addItem = useItemsStore(state => state.addItem);
  const updateItem = useItemsStore(state => state.updateItem);
  const deleteItem = useItemsStore(state => state.deleteItem);
  const loadItems = useItemsStore(state => state.loadItems);
  const markAsDone = useItemsStore(state => state.markAsDone);
  const markAsUndone = useItemsStore(state => state.markAsUndone);
  const skipOccurrence = useItemsStore(state => state.skipOccurrence);
  
  // AI Super Powers - Context preservation state
  const [lastMentionedItem, setLastMentionedItem] = useState<Item | null>(null);
  const [lastCreatedItem, setLastCreatedItem] = useState<Item | null>(null);
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimeoutRef = useRef<any>(null);

  // Help Modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Add Task Modal state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  
  // Toast state for save confirmation
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Handle save success from AddTaskModal (now just a generic save success)
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
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

  const handleSaveSuccess = useCallback((title: string) => {
    showToast(`✓ Saved "${title}"`);
  }, [showToast]);



  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
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
    if (!text.trim()) return;

    // Add user message to chat
    addUserMessage(text);
    setProcessing(true);

    try {
      // Check if we're waiting for confirmation on a destructive action
      if (pendingAction) {
        const lowerText = text.toLowerCase().trim();
        const isConfirm = /^(yes|yeah|yep|sure|confirm|ok|okay|do it|go ahead|proceed)$/i.test(lowerText);
        const isCancel = /^(no|nope|cancel|nevermind|never mind|stop|don't|dont)$/i.test(lowerText);
        
        if (isConfirm) {
          // Execute the pending action
          if (pendingAction.type === 'batch_delete_occurrence' && pendingAction.targetDate) {
            const targetDate = pendingAction.targetDate;
            const expanded = expandRepeatingItems(items.filter(i => i.status !== 'archived'), 365);
            const targetDateObj = new Date(targetDate + 'T00:00:00');
            
            const matching = expanded.filter(e => {
              const displayDate = e.displayDate instanceof Date 
                ? e.displayDate
                : new Date(e.displayDate);
              const displayDateStr = formatLocalDate(displayDate);
              return displayDateStr === targetDate;
            });
            
            let deletedCount = 0;
            for (const expandedItem of matching) {
              const baseItem = items.find(i => i.id === expandedItem.id);
              if (baseItem) {
                if (baseItem.repeat && baseItem.repeat !== 'none') {
                  await skipOccurrence(baseItem.id, targetDateObj);
                } else {
                  await deleteItem(baseItem.id);
                }
                deletedCount++;
              }
            }
            
            await loadItems();
            addAssistantMessage(`Done! Cleared ${deletedCount} item(s) from ${targetDate}.`);
          } else if (pendingAction.type === 'batch_delete' && pendingAction.matchedItemIds) {
            let deletedCount = 0;
            for (const id of pendingAction.matchedItemIds) {
              await deleteItem(id);
              deletedCount++;
            }
            await loadItems();
            addAssistantMessage(`Done! Deleted ${deletedCount} item(s).`);
          }
          clearPendingAction();
          return;
        } else if (isCancel) {
          clearPendingAction();
          addAssistantMessage("Okay, cancelled. Nothing was deleted.");
          return;
        } else {
          // User said something else - cancel and process as new message
          clearPendingAction();
          addAssistantMessage("Okay, I won't delete those. Let me help you with something else.");
          // Continue processing as new message instead of returning
        }
      }

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
            
            // Fallback: if title is missing but details/description exists, use that as title
            // This handles AI incorrectly mapping user's answer to wrong field
            let title = data.title;
            if (!title && (data as any).details) {
              title = (data as any).details;
              console.log('[Chat] Using details as title fallback:', title);
            }
            if (!title && (data as any).description) {
              title = (data as any).description;
              console.log('[Chat] Using description as title fallback:', title);
            }
            
            // CRITICAL: Check if date is required but missing
            const itemType = data.type ?? 'task';
            const requiresDate = itemType !== 'note';
            const hasDate = data.dueAt || data.remindAt;
            
            if (title && requiresDate && !hasDate) {
              // We have a title but no date - need to ask for date
              console.log('[Chat] Item has title but missing date, asking for date');
              
              // Update pending item with the title, and ask for date
              const updatedData = { ...pendingItem.partialData, ...data, title };
              startPendingItem(
                updatedData,
                [],
                itemType === 'reminder'
                  ? `When would you like to be reminded about "${title}"?`
                  : `When do you want to be reminded about "${title}"?`,
                'remindAt'
              );
              addAssistantMessage(
                itemType === 'reminder'
                  ? `When would you like to be reminded about "${title}"?`
                  : `When do you want to be reminded about "${title}"?`,
                undefined,
                'remindAt'
              );
              return;
            }
            
            if (title && (!requiresDate || hasDate)) {
              await addItem(title, {
                type: itemType,
                priority: data.priority ?? 'med',
                details: data.title ? data.details : undefined, // Only use details if we had a real title
                dueAt: data.dueAt ?? null,
                remindAt: data.remindAt ?? null,
                repeat: data.repeat ?? 'none',
                repeatConfig: data.repeatConfig ? (typeof data.repeatConfig === 'string' ? data.repeatConfig : JSON.stringify(data.repeatConfig)) : null,
                status: 'active',
                confidence: 0.9,
              });

              addAssistantMessage(`Perfect! I've added "${title}" to your list.`, {
                type: 'created',
                itemType: itemType,
                itemId: '',
                itemTitle: title,
              });
              completePendingItem();
            } else if (!title) {
              // Complete flag set but no title - something went wrong, ask again
              console.warn('[Chat] Follow-up complete but missing title:', followUpResult);
              addAssistantMessage("I didn't catch the details. Could you tell me what you'd like to add?");
              completePendingItem(); // Clear the pending state to start fresh
            }
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
          } else {
            // Unexpected response format - recover gracefully
            console.warn('[Chat] Unexpected follow-up result format:', followUpResult);
            addAssistantMessage("I'm having trouble understanding. Could you try again?");
            completePendingItem(); // Clear the pending state
          }
        } else {
          // followUpResult is null/undefined - API may have failed
          console.error('[Chat] processFollowUpAnswer returned null/undefined');
          addAssistantMessage("Sorry, I couldn't process that. Could you try again?");
          completePendingItem(); // Clear the pending state
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

      // Generate smart context for AI (covers 365 days with minimal tokens)
      // Repeating items are summarized by pattern, one-time items are listed
      const fullScheduleContext = buildFullContext(items);
      
      // For delete operations, we still need to expand items to find matches
      const expandedItems = expandRepeatingItems(items.filter(i => i.status !== 'archived'), 365);

      // DEBUG: Show context if requested
      if (text.trim() === '/debug') {
         addAssistantMessage(`DEBUG CONTEXT (Raw: ${items.length} items):\n\n${fullScheduleContext}`);
         setProcessing(false);
         return;
      }

      // Build chat history for context awareness
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Analyze intent with full context including chat history
      const result = await aiService.analyzeIntent(text, existingItems, fullScheduleContext, chatHistory);

      // Handle based on intent
      switch (result.intent) {
        case 'create': {
          // DEFENSIVE CHECK: Comprehensive validation for required fields based on item type
          // Determine required fields based on item type
          const itemType = result.itemData?.type;
          const hasTitle = result.itemData?.title && result.itemData.title.trim() !== '';
          const hasDate = result.itemData?.dueAt || result.itemData?.remindAt;

          // Check what's missing based on type
          const missingFields: string[] = [];

          if (!hasTitle) {
            missingFields.push('title');
          }

          // Tasks, reminders, bills, and followups ALL require a date/time
          // Only notes are exempt from date requirements
          const requiresDate = itemType !== 'note';
          if (requiresDate && !hasDate) {
            missingFields.push('dueAt');
          }

          // If any required fields are missing, force clarification
          if (missingFields.length > 0) {
            result.needsClarification = true;
            
            // Generate appropriate question based on what's missing - TITLE FIRST
            if (missingFields.includes('title')) {
              // Always ask for title first, regardless of other missing fields
              result.clarificationQuestion = itemType === 'reminder' 
                ? `What should I remind you about?`
                : `What's the ${itemType || 'task'}?`;
            } else if (missingFields.includes('dueAt')) {
              // Ask for reminder time after title is known
              result.clarificationQuestion = itemType === 'reminder'
                ? `When would you like to be reminded?`
                : `When do you want to be reminded about this?`;
            }
            
            result.missingFields = missingFields.filter(f => f !== 'dueAt') as any;
          }

          // CRITICAL: Detect and reject midnight defaults (12:00 AM) when no time was specified
          if (result.itemData && (result.itemData.dueAt || result.itemData.remindAt)) {
            const checkTime = result.itemData.remindAt || result.itemData.dueAt;
            if (checkTime) {
              const timeDate = new Date(checkTime);
              const hours = timeDate.getHours();
              const minutes = timeDate.getMinutes();
              
              // If time is exactly midnight (00:00) and user didn't explicitly say "midnight"
              if (hours === 0 && minutes === 0 && !text.toLowerCase().includes('midnight') && !text.toLowerCase().includes('12 am')) {
                // This is likely a default, not user intent - force clarification
                result.needsClarification = true;
                result.clarificationQuestion = `What time on ${timeDate.toLocaleDateString('en-US', { weekday: 'long' })} would you like to be reminded?`;
                result.missingFields = ['remindAt'] as any;
                
                // Clear the incorrect time
                if (result.itemData) {
                  result.itemData.dueAt = null;
                  result.itemData.remindAt = null;
                }
              }
            }
          }
          
          // Check if AI is asking for clarification
          if (result.needsClarification && result.clarificationQuestion && result.itemData) {
            // Start pending item and ask the question
            // Filter out 'title' from missingFields as startPendingItem doesn't accept it
            const validMissingFields = (result.missingFields || []).filter(
              f => f !== 'title'
            ) as ('priority' | 'dueAt' | 'remindAt' | 'type' | 'details')[];
            const firstMissingField = validMissingFields[0] || 'priority';
            startPendingItem(
              result.itemData,
              validMissingFields,
              result.clarificationQuestion,
              firstMissingField
            );
            addAssistantMessage(result.clarificationQuestion, undefined, firstMissingField);
          } else if (result.itemData && result.itemData.title && result.itemData.type) {
            // All item types except notes require a date/reminder time
            const itemType = result.itemData.type;
            const requiresDate = itemType !== 'note';
            const hasDate = result.itemData.dueAt || result.itemData.remindAt;
            
            if (requiresDate && !hasDate) {
              // Force clarification for missing date
              const question = itemType === 'reminder'
                ? `When would you like to be reminded?`
                : `When do you want to be reminded about this?`;
              
              startPendingItem(
                result.itemData,
                [],
                question,
                'dueAt' as any
              );
              addAssistantMessage(question, undefined, 'dueAt' as any);
            } else {
              // Create immediately (existing code)
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
              
              // Find the newly created item to set lastMentionedItem and lastCreatedItem
              const createdItem = items.find(i => i.title === result.itemData!.title && i.status === 'active');
              if (createdItem) {
                setLastMentionedItem(createdItem);
                setLastCreatedItem(createdItem);
              }
              
              addAssistantMessage(result.responseText, {
                type: 'created',
                itemType: result.itemData.type,
                itemId: '',
                itemTitle: result.itemData.title,
              });
            }
          } else {
            addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'batch_update': {
          const operations = result.batchOperations || [];
          let updatedCount = 0;
          
          for (const op of operations) {
              const { ids, updates } = op;
              if (ids && ids.length > 0 && updates) {
                  for (const id of ids) {
                      await updateItem(id, updates);
                      updatedCount++;
                  }
              }
          }
          
          if (updatedCount > 0) {
              await loadItems();
          }
          addAssistantMessage(result.responseText);
          break;
        }

        case 'batch_delete': {
          const operations = result.batchOperations || [];
          let ids = operations.flatMap(op => op.ids || []);
          
          // Fallback: If AI didn't provide IDs but mentioned item titles, try to match
          // Use EXACT title matching to avoid matching unrelated items
          if (ids.length === 0 && result.responseText) {
            const responseTextLower = result.responseText.toLowerCase();
            const foundItems = items.filter(item => {
              const titleLower = item.title.toLowerCase();
              // Only match if the FULL title appears in the response
              return responseTextLower.includes(titleLower);
            });
            ids = foundItems.map(i => i.id);
          }
          
          let deletedCount = 0;
          if (ids.length > 0) {
             for (const id of ids) {
                 await deleteItem(id);
                 deletedCount++;
             }
             await loadItems();
             addAssistantMessage(result.responseText || `Deleted ${deletedCount} item(s).`);
          } else {
             addAssistantMessage("I couldn't find those items to delete. Could you be more specific?");
          }
          break;
        }

        case 'batch_create': {
          if (result.items && result.items.length > 0) {
            let successCount = 0;
            let lastCreated: Item | null = null;
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
              // Track the last created item
              const createdItem = items.find(i => i.title === item.title && i.status === 'active');
              if (createdItem) {
                lastCreated = createdItem;
              }
            }
            // Set lastCreatedItem to the last item created in the batch
            if (lastCreated) {
              setLastCreatedItem(lastCreated);
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
            // Set lastMentionedItem before performing the update
            setLastMentionedItem(matchingItem);
            
            // Check for specific occurrence completion/uncompletion
            if (result.occurrenceDate && (result.updates.status === 'done' || result.updates.status === 'active')) {
               const parts = result.occurrenceDate.split('-');
               if (parts.length === 3) {
                   const year = parseInt(parts[0]);
                   const month = parseInt(parts[1]) - 1;
                   const day = parseInt(parts[2]);
                   const localDate = new Date(year, month, day);
                   
                   if (result.updates.status === 'done') {
                       await markAsDone(matchingItem.id, localDate);
                   } else {
                       await markAsUndone(matchingItem.id, localDate);
                   }
                   await loadItems(); // Force refresh to update UI
               }
            } else {
               // Standard update
               await updateItem(matchingItem.id, result.updates);
            }
            
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
            // Set lastMentionedItem BEFORE deleting the item
            setLastMentionedItem(matchingItem);
            
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

        // ============================================
        // AI SUPER POWERS - New Intent Handlers
        // ============================================

        case 'delete_occurrence': {
          // Delete a SPECIFIC occurrence of a repeating item (or delete one-time item entirely)
          let matchingItem: Item | undefined;
          
          if (result.matchedItemId) {
            matchingItem = items.find(i => i.id === result.matchedItemId);
          }
          if (!matchingItem && result.searchQuery) {
            matchingItem = findMatchingItem(items, result.searchQuery);
          }
          
          if (matchingItem && result.targetDate) {
            const targetDate = new Date(result.targetDate + 'T12:00:00');
            
            if (matchingItem.repeat && matchingItem.repeat !== 'none') {
              // Repeating item: skip this occurrence only
              await skipOccurrence(matchingItem.id, targetDate);
              setLastMentionedItem(matchingItem);
              addAssistantMessage(result.responseText, {
                type: 'deleted',
                itemType: matchingItem.type,
                itemId: matchingItem.id,
                itemTitle: `${matchingItem.title} (${result.targetDate})`,
              });
            } else {
              // One-time item: delete entirely
              await deleteItem(matchingItem.id);
              setLastMentionedItem(matchingItem);
              addAssistantMessage(result.responseText, {
                type: 'deleted',
                itemType: matchingItem.type,
                itemId: matchingItem.id,
                itemTitle: matchingItem.title,
              });
            }
            await loadItems();
          } else if (!matchingItem) {
            addAssistantMessage("I couldn't find that item. Could you be more specific?");
          } else {
            addAssistantMessage("I need to know which date to remove. Could you specify?");
          }
          break;
        }

        case 'batch_delete_occurrence': {
          // Delete ALL items on a specific date - requires confirmation
          const targetDate = result.targetDate;
          if (targetDate) {
            const expanded = expandRepeatingItems(items.filter(i => i.status !== 'archived'), 365);
            const targetDateStr = targetDate; // YYYY-MM-DD
            
            // Find all items matching this date
            const matching = expanded.filter(e => {
              const displayDate = e.displayDate instanceof Date 
                ? e.displayDate
                : new Date(e.displayDate);
              const displayDateStr = formatLocalDate(displayDate);
              return displayDateStr === targetDateStr;
            });
            
            if (matching.length === 0) {
              addAssistantMessage(`There are no items scheduled for ${targetDate}.`);
            } else {
              // Format the date nicely for the confirmation message
              const dateObj = new Date(targetDate + 'T12:00:00');
              const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              });
              
              // Store the pending action for confirmation
              startPendingAction({
                type: 'batch_delete_occurrence',
                targetDate: targetDate,
                confirmationMessage: `This will delete ${matching.length} item(s) from ${formattedDate}. Are you sure?`,
              });
              
              // List the items that will be deleted
              const itemList = matching.map(m => `• ${m.title}`).join('\n');
              addAssistantMessage(
                `This will delete ${matching.length} item(s) from **${formattedDate}**:\n\n${itemList}\n\nAre you sure? (yes/no)`
              );
            }
          } else {
            addAssistantMessage("I need to know which date to clear. Could you specify?");
          }
          break;
        }

        case 'bulk_reschedule': {
          // Move items from one date to another
          const { fromDate, toDate, preserveTime } = result.rescheduleConfig || {};
          if (fromDate && toDate) {
            const expanded = expandRepeatingItems(items.filter(i => i.status !== 'archived'), 365);
            
            // Find items on the source date
            // Use formatLocalDate to avoid UTC conversion issues (e.g., 9 PM PST -> next day in UTC)
            const matching = expanded.filter(e => {
              const displayDate = e.displayDate instanceof Date 
                ? e.displayDate
                : new Date(e.displayDate);
              const displayDateStr = formatLocalDate(displayDate);
              return displayDateStr === fromDate;
            });
            
            // Get unique base item IDs (avoid rescheduling same item multiple times)
            const processedIds = new Set<string>();
            let rescheduledCount = 0;
            
            for (const expandedItem of matching) {
              if (processedIds.has(expandedItem.id)) continue;
              processedIds.add(expandedItem.id);
              
              const baseItem = items.find(i => i.id === expandedItem.id);
              if (baseItem && (!baseItem.repeat || baseItem.repeat === 'none')) {
                // Only reschedule one-time items (repeating items keep their pattern)
                const oldDue = baseItem.dueAt;
                const timeStr = oldDue && preserveTime !== false ? oldDue.slice(10) : 'T12:00:00';
                const newDue = toDate + timeStr;
                
                // Calculate new reminder if exists
                let newRemind = null;
                if (baseItem.remindAt && baseItem.dueAt) {
                  const oldDueTime = new Date(baseItem.dueAt).getTime();
                  const oldRemindTime = new Date(baseItem.remindAt).getTime();
                  const offset = oldDueTime - oldRemindTime;
                  newRemind = new Date(new Date(newDue).getTime() - offset).toISOString();
                }
                
                await updateItem(baseItem.id, { 
                  dueAt: newDue,
                  ...(newRemind && { remindAt: newRemind })
                });
                rescheduledCount++;
              }
            }
            
            await loadItems();
            addAssistantMessage(result.responseText || `Moved ${rescheduledCount} item(s) from ${fromDate} to ${toDate}.`);
          } else {
            addAssistantMessage("I need both the source and destination dates. Could you clarify?");
          }
          break;
        }

        case 'bulk_complete': {
          // Mark multiple items as done
          const targetDate = result.targetDate || getTodayLocalDate();
          const expanded = expandRepeatingItems(items.filter(i => i.status !== 'archived'), 365);
          const targetDateObj = new Date(targetDate + 'T12:00:00');
          
          // Use formatLocalDate to avoid UTC conversion issues (e.g., 9 PM PST -> next day in UTC)
          const matching = expanded.filter(e => {
            if (e.isCompleted) return false; // Skip already completed
            const displayDate = e.displayDate instanceof Date 
              ? e.displayDate
              : new Date(e.displayDate);
            const displayDateStr = formatLocalDate(displayDate);
            return displayDateStr === targetDate;
          });
          
          let completedCount = 0;
          for (const expandedItem of matching) {
            await markAsDone(expandedItem.id, targetDateObj);
            completedCount++;
          }
          
          await loadItems();
          addAssistantMessage(result.responseText || `Marked ${completedCount} item(s) as done.`);
          break;
        }

        case 'conditional_delete': {
          // Delete items matching specific criteria
          const filters = result.filterCriteria || {};
          let toDelete = items.filter(i => i.status === 'active');
          
          if (filters.priorities && filters.priorities.length > 0) {
            toDelete = toDelete.filter(i => filters.priorities!.includes(i.priority));
          }
          if (filters.types && filters.types.length > 0) {
            toDelete = toDelete.filter(i => filters.types!.includes(i.type));
          }
          if (filters.hasNoDueDate) {
            toDelete = toDelete.filter(i => !i.dueAt);
          }
          if (filters.isOverdue) {
            const now = new Date();
            toDelete = toDelete.filter(i => i.dueAt && new Date(i.dueAt) < now);
          }
          if (filters.isCompleted) {
            toDelete = items.filter(i => i.status === 'done');
          }
          if (filters.titleContains) {
            const search = filters.titleContains.toLowerCase();
            toDelete = toDelete.filter(i => i.title.toLowerCase().includes(search));
          }
          
          let deletedCount = 0;
          for (const item of toDelete) {
            await deleteItem(item.id);
            deletedCount++;
          }
          
          await loadItems();
          addAssistantMessage(result.responseText || `Deleted ${deletedCount} item(s) matching your criteria.`);
          break;
        }

        case 'archive_completed': {
          // Archive completed items
          const filters = result.filterCriteria || {};
          let toArchive = items.filter(i => i.status === 'done');
          
          if (filters.olderThan) {
            const cutoff = new Date(filters.olderThan);
            toArchive = toArchive.filter(i => new Date(i.updatedAt) < cutoff);
          }
          
          let archivedCount = 0;
          for (const item of toArchive) {
            await updateItem(item.id, { status: 'archived' });
            archivedCount++;
          }
          
          await loadItems();
          addAssistantMessage(result.responseText || `Archived ${archivedCount} completed item(s).`);
          break;
        }

        case 'analytics': {
          // AI computes and returns analytics - just display the response
          // The AI has already computed analyticsData and formatted responseText
          addAssistantMessage(result.responseText);
          break;
        }

        case 'quick_action': {
          // Voice shortcuts: Done, Not now, Tomorrow
          switch (result.quickAction) {
            case 'complete_last':
              if (lastMentionedItem) {
                await markAsDone(lastMentionedItem.id);
                await loadItems();
                addAssistantMessage(result.responseText || `Done! Completed "${lastMentionedItem.title}".`);
              } else {
                addAssistantMessage("I'm not sure which task you mean. Could you be more specific?");
              }
              break;
              
            case 'snooze':
              if (lastMentionedItem) {
                const snoozeTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
                await updateItem(lastMentionedItem.id, { remindAt: snoozeTime.toISOString() });
                await loadItems();
                addAssistantMessage(result.responseText || `Snoozed "${lastMentionedItem.title}" for 1 hour.`);
              } else {
                addAssistantMessage("I'm not sure which item to snooze. Could you specify?");
              }
              break;
              
            case 'reschedule_tomorrow':
              if (lastMentionedItem) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(12, 0, 0, 0);
                await updateItem(lastMentionedItem.id, { dueAt: tomorrow.toISOString() });
                await loadItems();
                addAssistantMessage(result.responseText || `Moved "${lastMentionedItem.title}" to tomorrow.`);
              } else {
                addAssistantMessage("I'm not sure which item to reschedule. Could you specify?");
              }
              break;
              
            case 'undo_last':
              // TODO: Implement undo functionality with action history
              addAssistantMessage("Undo is not yet implemented. I'll remember this for a future update!");
              break;
              
            default:
              addAssistantMessage(result.responseText);
          }
          break;
        }

        case 'query':
        case 'summary':
        case 'suggest': {
          // AI provides data-driven responses
          // TODO: Future enhancement - identify and set lastMentionedItem when AI response references specific items
          // This would enable quick actions to work after query responses
          
          // Also check for proactive suggestions
          if (result.proactiveSuggestion) {
            addAssistantMessage(result.responseText + `\n\n💡 **Suggestion:** ${result.proactiveSuggestion.message}`);
          } else {
            addAssistantMessage(result.responseText);
          }
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
        // Always ensure processing state is reset
        setProcessing(false);
    }
  }, [items, pendingItem, pendingAction, addUserMessage, addItem, updateItem, deleteItem, addAssistantMessage, setProcessing, startPendingItem, completePendingItem, cancelPendingItem, startPendingAction, clearPendingAction, loadItems, markAsDone, skipOccurrence, lastMentionedItem]);

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
      
      // Auto-stop after 1 minute
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
          if (recordingRef.current) {
             console.log('Recording timeout reached');
             Alert.alert('Time Limit', 'Recording stopped automatically (1 min limit).');
             stopAndSendRecording();
          }
      }, 60000); // 1 minute
      
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  // Stop and Process Recording
  const stopAndSendRecording = async () => {
    // Clear timeout
    if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
    }

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
    if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
    }
    
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

  // Handle plus button press - open AddTaskModal for manual task creation
  const handlePlusPress = useCallback(() => {
    setShowAddTaskModal(true);
  }, []);

  // Handle clear chat - confirm before clearing
  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all chat history? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearSession(),
        },
      ]
    );
  }, [messages.length, clearSession]);



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']} // Bottom handled by ChatInputBar
      >
        <View style={[
          styles.contentWrapper,
          isDesktop && { maxWidth: contentWidth, alignSelf: 'center', width: '100%' }
        ]}>
          {/* Floating Header with Liquid Glass */}
          <GlassyHeader
            disableTopSafeArea
            isFloatingPill
            isModalSheet
            leftAction={
              <TouchableOpacity 
                onPress={() => onClose ? onClose() : router.back()}
                style={[styles.iconButton, { backgroundColor: colors.text + '10' }]}
              >
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            }
            rightAction={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Clear Chat Button - only show when there are messages */}
                {messages.length > 0 && (
                  <TouchableOpacity 
                    onPress={handleClearChat}
                    activeOpacity={0.6}
                    style={[styles.iconButton, { backgroundColor: colors.text + '10', marginRight: 8 }]}
                  >
                    <Trash2 size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                
                {/* Info Button */}
                <TouchableOpacity 
                  onPress={() => setShowHelpModal(true)}
                  activeOpacity={0.6}
                  style={[styles.iconButton, { backgroundColor: colors.text + '10' }]}
                >
                  <Info size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            }
          >
            <RainbowSparkles size={20} />
          </GlassyHeader>

        <HelpModal visible={showHelpModal} onClose={() => setShowHelpModal(false)} />
        <AddTaskModal 
          visible={showAddTaskModal} 
          onClose={() => setShowAddTaskModal(false)}
          onSaveSuccess={handleSaveSuccess}
        />

        {/* Chat Messages Area... */}
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
              <ChatMessage 
                key={message.id} 
                message={message} 
              />
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
       </View>
     </SafeAreaView>

     {/* ChatInputBar - OUTSIDE SafeAreaView, handles its own bottom padding */}
     <KeyboardAvoidingView
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
       keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
       style={isDesktop ? { alignItems: 'center' } : undefined}
     >
       <View style={isDesktop ? { width: contentWidth, maxWidth: 700 } : undefined}>
         <ChatInputBar
          onSend={handleSend}
          onVoicePress={startRecording}
          onPlusPress={handlePlusPress}
          onCancelRecording={cancelRecording}
          onSendRecording={stopAndSendRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
          />
        </View>
      </KeyboardAvoidingView>

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
              maxWidth: isDesktop ? 400 : undefined,
              alignSelf: isDesktop ? 'center' : undefined,
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
  contentWrapper: {
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
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 50,
    maxHeight: 150,
    marginBottom: 8,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 5,
  },
  plusButtonText: {
    fontSize: 24,
    lineHeight: 24,
    color: 'white',
  },
  textInput: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingTop: 12, // For multiline input, align text to top
    paddingBottom: 12,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 140, // Max height for multiline input
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 5,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 5,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
  },
  cancelRecordingButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sendRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
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
