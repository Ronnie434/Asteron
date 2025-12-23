import { ItemType, ItemPriority } from '../db/items';

export interface ParsedItemStub {
    title: string;
    type: ItemType;
    priority: ItemPriority;
    confidence: number;
}

export const parseTextStub = async (text: string): Promise<ParsedItemStub> => {
    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        title: text.trim(),
        type: 'task',
        priority: 'med',
        confidence: 0.8,
    };
};
