import { ItemType, ItemPriority } from '../db/items';
import * as FileSystem from 'expo-file-system/legacy';

export interface AIAnalysisResult {
    title: string;
    type: ItemType;
    priority: ItemPriority;
    confidence: number;
    details?: string;
    dueAt?: string | null;
    remindAt?: string | null;
    needsClarification?: boolean;
    clarificationReason?: 'missing_date' | 'missing_person' | 'missing_amount' | 'ambiguous_action' | 'other';
}

/**
 * Chat intent types for conversational interactions.
 */
export type ChatIntentType = 'create' | 'update' | 'delete' | 'query' | 'chat';

/**
 * Result from analyzing a chat message for intent.
 */
export interface ChatIntentResult {
    intent: ChatIntentType;
    confidence: number;
    responseText: string;

    // For create intent
    itemData?: {
        title: string;
        type: ItemType;
        priority: ItemPriority;
        details?: string;
        dueAt?: string | null;
        remindAt?: string | null;
    };

    // For update/delete intent - search query to find existing item
    searchQuery?: string;

    // For update intent - fields to update
    updates?: {
        title?: string;
        dueAt?: string | null;
        remindAt?: string | null;
        priority?: ItemPriority;
        status?: 'active' | 'done' | 'archived';
    };
}

export interface AIService {
    transcribeAudio: (audioUri: string, format?: 'wav' | 'aac') => Promise<string>;
    analyzeText: (text: string) => Promise<AIAnalysisResult>;
    analyzeIntent: (text: string, existingItems?: { id: string; title: string; type: ItemType }[]) => Promise<ChatIntentResult>;
}

// Load API key from environment variables
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('⚠️ EXPO_PUBLIC_OPENROUTER_API_KEY is not set. Please create a .env file with your API key.');
}
// Use Gemini 2.0 Flash Lite for cost-effective multimodal support
const MODEL = 'google/gemini-2.0-flash-lite-001';

async function fetchWithRetry(url: string, options: RequestInit, retries = 5, delay = 2000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }

            return response;
        } catch (error) {
            console.error(`Fetch error (attempt ${i + 1}):`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries exceeded');
}

/**
 * AI Service implementation using OpenRouter with Gemini 1.5 Flash.
 */
export const aiService: AIService = {
    transcribeAudio: async (audioUri: string, format: 'wav' | 'aac' = 'wav'): Promise<string> => {
        try {
            const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
                encoding: 'base64',
            });

            // Prepare the request body for OpenRouter
            const body = {
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are a speech-to-text transcriber. Your ONLY job is to transcribe the audio exactly as spoken. Do NOT respond to the content, do NOT have a conversation, do NOT answer questions. Just output the exact words that were spoken in the audio. If the audio is unclear or silent, output '[unclear]' or '[silence]'."
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Transcribe this audio exactly. Only output the spoken words, nothing else."
                            },
                            {
                                type: "input_audio",
                                input_audio: {
                                    data: base64Audio,
                                    format: format
                                }
                            }
                        ]
                    }
                ]
            };

            const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://asteron.app",
                    "X-Title": "Asteron",
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const transcription = data.choices[0]?.message?.content || "";
            return transcription.trim();

        } catch (error) {
            console.error('Transcription failed:', error);
            throw error;
        }
    },

    analyzeText: async (text: string): Promise<AIAnalysisResult> => {
        try {
            // Get current timezone and time for date resolution
            // Get current LOCAL timezone and time for date resolution
            const now = new Date();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Format as local ISO with timezone offset (e.g., "2024-12-23T17:31:00-08:00")
            const tzOffset = -now.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
            const offsetMins = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
            const offsetSign = tzOffset >= 0 ? '+' : '-';
            const localIso = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + 'T' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0') +
                offsetSign + offsetHours + ':' + offsetMins;

            const prompt = `You extract a single actionable item from the user's voice input for a task/reminder/bill/follow-up app.

Return ONLY valid JSON. No extra text. No markdown.

INTERPRETATION RULES
- The user is creating an item, not chatting.
- Extract ONE best item. If multiple items are mentioned, pick the most urgent/time-bound one.
- "dueAt" is the deadline date/time (when it must be done/paid).
- "remindAt" is when to notify the user.
- If the user gives a date without a time, choose a sensible default time:
  - default remind time: 09:00 local time
  - default due time: 17:00 local time (or 23:59 for bills if phrased "by end of day")
- If the user says "tomorrow", "next week", "Friday", etc., resolve it using:
  - USER_TIMEZONE: ${timezone}
  - NOW: ${localIso}
- If date/time is unclear, still extract the action and set needsClarification=true with a reason.
- Never ask the user questions; only set needsClarification flags.
- Keep title short and verb-first (e.g., "Call mom", "Pay electricity bill").

TYPE SELECTION RULES
- task: Clear actionable to-dos with a verb ("Buy milk", "Clean garage", "Fix the bug")
- bill: Payment related ("Pay internet", "Netflix subscription")
- reminder: Explicit "remind me" or time-bound alerts
- followup: "Call X", "Email Y", "Reply to Z"
- note: DEFAULT TYPE. Use for: random thoughts, information to remember, unclear/gibberish text, questions, ideas, anything without a clear actionable verb or deadline. When in doubt, use "note".

PRIORITY RULES
- high: bills, deadlines, legal/medical, "urgent", "ASAP", "today/tomorrow"
- med: normal tasks and follow-ups
- low: notes, ideas, someday/maybe

OUTPUT SCHEMA (exact keys)
{
  "title": "string (max 60 chars)",
  "type": "task" | "bill" | "reminder" | "followup" | "note",
  "priority": "low" | "med" | "high",
  "confidence": number (0.0 to 1.0),
  "details": "string (the original text or cleaned transcript)",
  "dueAt": "string (ISO 8601 with timezone offset) | null",
  "remindAt": "string (ISO 8601 with timezone offset) | null",
  "needsClarification": boolean,
  "clarificationReason": "missing_date" | "missing_person" | "missing_amount" | "ambiguous_action" | "other" | null
}

USER INPUT:
"${text}"
`;

            const body = {
                model: MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" }
            };

            const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://asteron.app",
                    "X-Title": "Asteron",
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            // Clean up code blocks if present
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanContent);

        } catch (error) {
            console.error('Analysis failed:', error);
            // Fallback: default to note type
            return {
                title: text.slice(0, 50),
                type: 'note',
                priority: 'low',
                confidence: 0.5,
                details: text,
            };
        }
    },

    analyzeIntent: async (text: string, existingItems?: { id: string; title: string; type: ItemType }[]): Promise<ChatIntentResult> => {
        try {
            const now = new Date();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const tzOffset = -now.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
            const offsetMins = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
            const offsetSign = tzOffset >= 0 ? '+' : '-';
            const localIso = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + 'T' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0') +
                offsetSign + offsetHours + ':' + offsetMins;

            // Build context about existing items for update/delete operations
            const itemsContext = existingItems && existingItems.length > 0
                ? `\nEXISTING ITEMS THE USER HAS:\n${existingItems.map(i => `- "${i.title}" (${i.type})`).join('\n')}\n`
                : '\nNo existing items.\n';

            const prompt = `You are a helpful AI assistant for a task/reminder app. Analyze the user's message and determine their intent.

CURRENT TIME: ${localIso}
TIMEZONE: ${timezone}
${itemsContext}

INTENT TYPES:
- "create": User wants to create a new task, reminder, note, or bill
- "update": User wants to modify an existing item (change date, rename, etc.)
- "delete": User wants to remove an existing item
- "query": User is asking about their items (what's scheduled, etc.)
- "chat": General conversation, greeting, thanks, or unclear intent

RESPONSE RULES:
1. Always provide a friendly, conversational responseText
2. For "create": Extract item details (title, type, priority, dates)
3. For "update"/"delete": Provide searchQuery to find matching item
4. For "update": Also provide the updates to apply
5. Use existing items list to match update/delete requests
6. If user says "change X to Y" or "move X to Y", that's an update
7. If user says "delete X" or "remove X", that's a delete
8. Default to "create" if user is clearly describing a task but no match found

Return ONLY valid JSON:
{
  "intent": "create" | "update" | "delete" | "query" | "chat",
  "confidence": 0.0 to 1.0,
  "responseText": "string - friendly message to show user",
  "itemData": { // only for create
    "title": "string (max 60 chars, verb-first)",
    "type": "task" | "bill" | "reminder" | "followup" | "note",
    "priority": "low" | "med" | "high",
    "details": "original text",
    "dueAt": "ISO 8601 | null",
    "remindAt": "ISO 8601 | null"
  },
  "searchQuery": "string - keywords to find item", // for update/delete
  "updates": { // only for update
    "title": "new title | undefined",
    "dueAt": "ISO 8601 | null | undefined",
    "remindAt": "ISO 8601 | null | undefined",
    "priority": "low | med | high | undefined",
    "status": "done | undefined" // for marking complete
  }
}

USER MESSAGE:
"${text}"
`;

            const body = {
                model: MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" }
            };

            const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://asteron.app",
                    "X-Title": "Asteron",
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanContent);

        } catch (error) {
            console.error('Intent analysis failed:', error);
            // Fallback: treat as chat
            return {
                intent: 'chat',
                confidence: 0.5,
                responseText: "I'm not quite sure what you meant. Could you try rephrasing that?",
            };
        }
    }
};
