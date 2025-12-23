import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as DB from '../db/items';
import type { Item, ItemStatus } from '../db/items';

interface ItemsState {
    items: Item[];
    isLoading: boolean;
    initialized: boolean;

    // Actions
    init: () => Promise<void>;
    loadItems: () => Promise<void>;
    addItem: (
        title: string,
        initialProps?: Partial<Omit<Item, 'id' | 'title' | 'createdAt' | 'updatedAt'>>
    ) => Promise<void>;
    updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    markAsDone: (id: string) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
    items: [],
    isLoading: false,
    initialized: false,

    init: async () => {
        if (get().initialized) return;
        try {
            await DB.initDb();

            // Force clear and reseed to get fresh mock data with updated dates
            const existing = await DB.listItems();

            // Delete all existing items to get fresh mock data
            for (const item of existing) {
                await DB.deleteItem(item.id);
            }

            // Seed fresh mock data
            const { MOCK_ITEMS } = require('../data/mock');
            for (const item of MOCK_ITEMS) {
                await DB.createItem(item);
            }

            set({ initialized: true });
            await get().loadItems();
        } catch (e) {
            console.error("Failed to init DB:", e);
        }
    },

    loadItems: async () => {
        set({ isLoading: true });
        try {
            // For now load all active items by default? Or just all items?
            // Let's load everything for simplicity unless we filter in UI
            const items = await DB.listItems();
            set({ items });
        } catch (e) {
            console.error("Failed to load items:", e);
        } finally {
            set({ isLoading: false });
        }
    },

    addItem: async (title, initialProps = {}) => {
        const now = new Date().toISOString();
        const newItem: Item = {
            id: Crypto.randomUUID(),
            title,
            type: 'task',
            priority: 'med',
            status: 'active',
            confidence: 1.0,
            details: null,
            dueAt: null,
            remindAt: null,
            createdAt: now,
            updatedAt: now,
            ...initialProps,
        };

        try {
            await DB.createItem(newItem);
            await get().loadItems();
        } catch (e) {
            console.error("Failed to add item:", e);
        }
    },

    updateItem: async (id, patch) => {
        try {
            const updatedAt = new Date().toISOString();
            await DB.updateItem(id, { ...patch, updatedAt });
            await get().loadItems();
        } catch (e) {
            console.error("Failed to update item:", e);
        }
    },

    deleteItem: async (id) => {
        try {
            await DB.deleteItem(id);
            await get().loadItems();
        } catch (e) {
            console.error("Failed to delete item:", e);
        }
    },

    markAsDone: async (id) => {
        await get().updateItem(id, { status: 'done' });
    },
}));
