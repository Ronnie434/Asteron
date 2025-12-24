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

export interface AIService {
    transcribeAudio: (audioUri: string) => Promise<string>;
    analyzeText: (text: string) => Promise<AIAnalysisResult>;
}

// Load API key from environment variables
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('⚠️ EXPO_PUBLIC_OPENROUTER_API_KEY is not set. Please create a .env file with your API key.');
}

// Use the same model for both (cost-effective)
const MODEL = 'google/gemini-2.0-flash-lite-001';

async function fetchWithRetry(url: string, options: RequestInit, retries = 5, delay = 2000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);

            if (response.status === 429) {
                console.log(`Rate limit hit (429), retrying in ${delay}ms...`);
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
 * AI Service implementation using OpenRouter with Gemini 2.0 Flash.
 */
export const aiService: AIService = {
    transcribeAudio: async (audioUri: string): Promise<string> => {
        console.log('Transcribing audio from:', audioUri);

        try {
            // Read the file as Base64
            const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
                encoding: 'base64',
            });
            console.log('Audio Base64 length:', base64Audio.length);

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
                                    format: "wav"
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
                    "HTTP-Referer": "https://ai-companion-eta-cyan.vercel.app", // Required by OpenRouter
                    "X-Title": "AI Companion App",
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
        console.log('Analyzing text:', text);

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
                    "HTTP-Referer": "https://ai-companion.app",
                    "X-Title": "AI Companion App",
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
    }
};
