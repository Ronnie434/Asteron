import { ItemType, ItemPriority } from '../db/items';

export interface ParsedItemStub {
    title: string;
    type: ItemType;
    priority: ItemPriority;
    confidence: number;
}

import { aiService } from './aiService';

export const parseTextStub = async (text: string): Promise<ParsedItemStub> => {
    const result = await aiService.analyzeText(text);
    return {
        title: result.title,
        type: result.type,
        priority: result.priority,
        confidence: result.confidence,
    };
};
