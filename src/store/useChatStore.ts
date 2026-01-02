import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { ItemType, ItemPriority, RepeatFrequency } from '../db/items';

/**
 * Chat message structure for the AI assistant conversation.
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    /** For AI responses that performed an action on items */
    actionResult?: {
        type: 'created' | 'updated' | 'deleted' | 'found';
        itemType: ItemType;
        itemId: string;
        itemTitle: string;
    };
    /** Indicates if this message is currently being processed */
    isLoading?: boolean;
    /** For AI questions that need follow-up */
    awaitingField?: string;
}

/**
 * State for tracking a pending item being created via multi-turn conversation
 */
export interface PendingItemState {
    partialData: {
        title?: string;
        type?: ItemType;
        priority?: ItemPriority;
        dueAt?: string | null;
        remindAt?: string | null;
        details?: string;
        repeat?: RepeatFrequency;
        repeatConfig?: string | null;
    };
    missingFields: ('priority' | 'dueAt' | 'remindAt' | 'type' | 'details')[];
    currentQuestion: string | null;
    awaitingField: string | null;
}

/**
 * State for tracking a pending destructive action awaiting confirmation
 */
export interface PendingActionState {
    type: 'batch_delete_occurrence' | 'batch_delete' | 'conditional_delete' | 'delete';
    targetDate?: string;
    targetDateEnd?: string;
    matchedItemIds?: string[];
    filterCriteria?: Record<string, any>;
    confirmationMessage: string;
}

interface ChatState {
    messages: ChatMessage[];
    isProcessing: boolean;
    pendingItem: PendingItemState | null;
    pendingAction: PendingActionState | null;

    // Actions
    addUserMessage: (content: string) => string;
    addAssistantMessage: (content: string, actionResult?: ChatMessage['actionResult'], awaitingField?: string) => string;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    setProcessing: (isProcessing: boolean) => void;
    clearSession: () => void;

    // Pending item actions for interactive questioning
    startPendingItem: (partialData: PendingItemState['partialData'], missingFields: PendingItemState['missingFields'], question: string, awaitingField: string) => void;
    updatePendingItem: (field: string, value: any) => void;
    completePendingItem: () => PendingItemState['partialData'] | null;
    cancelPendingItem: () => void;
    hasPendingItem: () => boolean;

    // Pending action methods for confirmation flow
    startPendingAction: (action: PendingActionState) => void;
    getPendingAction: () => PendingActionState | null;
    clearPendingAction: () => void;
    hasPendingAction: () => boolean;
}

/**
 * Chat store for managing the AI assistant conversation.
 * 
 * This store is intentionally NOT persisted - sessions are in-memory only.
 * - Persists while user navigates between tabs
 * - Clears when app is backgrounded or closed
 */
export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    isProcessing: false,
    pendingItem: null,
    pendingAction: null,

    addUserMessage: (content: string) => {
        const id = Crypto.randomUUID();
        const message: ChatMessage = {
            id,
            role: 'user',
            content,
            timestamp: new Date(),
        };

        set((state) => ({
            messages: [...state.messages, message],
        }));

        return id;
    },

    addAssistantMessage: (content: string, actionResult?: ChatMessage['actionResult'], awaitingField?: string) => {
        const id = Crypto.randomUUID();
        const message: ChatMessage = {
            id,
            role: 'assistant',
            content,
            timestamp: new Date(),
            actionResult,
            awaitingField,
        };

        set((state) => ({
            messages: [...state.messages, message],
            isProcessing: false,
        }));

        return id;
    },

    updateMessage: (id: string, updates: Partial<ChatMessage>) => {
        set((state) => ({
            messages: state.messages.map((msg) =>
                msg.id === id ? { ...msg, ...updates } : msg
            ),
        }));
    },

    setProcessing: (isProcessing: boolean) => {
        set({ isProcessing });
    },

    clearSession: () => {
        set({ messages: [], isProcessing: false, pendingItem: null, pendingAction: null });
    },

    // Start a new pending item when AI asks for clarification
    startPendingItem: (partialData, missingFields, question, awaitingField) => {
        set({
            pendingItem: {
                partialData,
                missingFields,
                currentQuestion: question,
                awaitingField,
            }
        });
    },

    // Update a field on the pending item
    updatePendingItem: (field: string, value: any) => {
        const { pendingItem } = get();
        if (!pendingItem) return;

        const updatedPartialData = {
            ...pendingItem.partialData,
            [field]: value,
        };

        const remainingFields = pendingItem.missingFields.filter(f => f !== field);

        set({
            pendingItem: {
                ...pendingItem,
                partialData: updatedPartialData,
                missingFields: remainingFields as PendingItemState['missingFields'],
                awaitingField: null,
                currentQuestion: null,
            }
        });
    },

    // Complete the pending item and return the data
    completePendingItem: () => {
        const { pendingItem } = get();
        if (!pendingItem) return null;

        const data = pendingItem.partialData;
        set({ pendingItem: null });
        return data;
    },

    // Cancel the pending item
    cancelPendingItem: () => {
        set({ pendingItem: null });
    },

    // Check if there's a pending item
    hasPendingItem: () => {
        return get().pendingItem !== null;
    },

    // Start a pending action awaiting confirmation
    startPendingAction: (action: PendingActionState) => {
        set({ pendingAction: action });
    },

    // Get the current pending action
    getPendingAction: () => {
        return get().pendingAction;
    },

    // Clear the pending action (after confirm or cancel)
    clearPendingAction: () => {
        set({ pendingAction: null });
    },

    // Check if there's a pending action
    hasPendingAction: () => {
        return get().pendingAction !== null;
    },
}));

