import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { ItemType } from '../db/items';

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
}

interface ChatState {
    messages: ChatMessage[];
    isProcessing: boolean;

    // Actions
    addUserMessage: (content: string) => string;
    addAssistantMessage: (content: string, actionResult?: ChatMessage['actionResult']) => string;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    setProcessing: (isProcessing: boolean) => void;
    clearSession: () => void;
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

    addAssistantMessage: (content: string, actionResult?: ChatMessage['actionResult']) => {
        const id = Crypto.randomUUID();
        const message: ChatMessage = {
            id,
            role: 'assistant',
            content,
            timestamp: new Date(),
            actionResult,
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
        set({ messages: [], isProcessing: false });
    },
}));
