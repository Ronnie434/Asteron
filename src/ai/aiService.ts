import { ItemType, ItemPriority } from '../db/items';
import * as FileSystem from 'expo-file-system/legacy';

export interface AIAnalysisResult {
    title: string;
    type: ItemType;
    priority: ItemPriority;
    confidence: number;
    details?: string;
    dueAt?: string;
    needsClarification?: boolean;
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

const MODEL = 'google/gemini-2.0-flash-lite-001';
// const MODEL = 'google/gemini-2.0-flash-exp:free';

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
                        role: "user",
                        content: [
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
            const prompt = `You are an AI assistant helping users capture tasks, reminders, bills, and follow-ups through voice input.

Your job is to analyze what the user said and extract a structured item from it.

IMPORTANT RULES:
1. The user is trying to CREATE a task/reminder/bill/follow-up, not have a conversation
2. Extract the actionable item from their speech
3. If the input is too vague or unclear, set "needsClarification" to true
4. Be smart about inferring intent - "call mom tomorrow" is clearly a task/reminder
5. Don't ask questions back - just extract what you can

Return ONLY a valid JSON object with this exact schema:
{
    "title": "string (concise, actionable summary - max 60 chars)",
    "type": "task" | "bill" | "reminder" | "followup",
    "priority": "low" | "med" | "high",
    "confidence": number (0.0 to 1.0 - how confident you are in the extraction),
    "details": "string (additional context or full transcription)",
    "dueAt": "string (ISO 8601 date if mentioned, otherwise null)",
    "needsClarification": boolean (true if input is too vague to extract a clear action)
}

EXAMPLES:

Input: "Call mom tomorrow"
Output: {"title": "Call mom", "type": "reminder", "priority": "med", "confidence": 0.9, "details": "Call mom tomorrow", "dueAt": "2024-01-15T12:00:00Z", "needsClarification": false}

Input: "Pay electricity bill by Friday"
Output: {"title": "Pay electricity bill", "type": "bill", "priority": "high", "confidence": 0.95, "details": "Pay electricity bill by Friday", "dueAt": "2024-01-12T23:59:59Z", "needsClarification": false}

Input: "um... something"
Output: {"title": "Awaiting instruction", "type": "task", "priority": "low", "confidence": 0.1, "details": "um... something", "dueAt": null, "needsClarification": true}

Now analyze this user input:
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
            // Fallback for debugging
            return {
                title: text.slice(0, 50),
                type: 'task',
                priority: 'med',
                confidence: 0.5,
                details: "Analysis failed, saved raw text.",
            };
        }
    }
};
