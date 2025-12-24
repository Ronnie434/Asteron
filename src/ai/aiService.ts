import { ItemType, ItemPriority } from '../db/items';
import * as FileSystem from 'expo-file-system/legacy';

export interface AIAnalysisResult {
    title: string;
    type: ItemType;
    priority: ItemPriority;
    confidence: number;
    details?: string;
    dueAt?: string;
}

export interface AIService {
    transcribeAudio: (audioUri: string) => Promise<string>;
    analyzeText: (text: string) => Promise<AIAnalysisResult>;
}

// TODO: The user will replace this with their actual key.
const OPENROUTER_API_KEY = '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';
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
            const prompt = `
            Analyze the following text and extract a structured task.
            Return ONLY a valid JSON object with the following schema:
            {
                "title": "string (concise summary)",
                "type": "task" | "bill" | "renewal" | "followup" | "reminder",
                "priority": "low" | "med" | "high",
                "confidence": number (0.0 to 1.0),
                "details": "string (additional context)",
                "dueAt": "string (ISO 8601 date, optional)"
            }
            
            Text to analyze: "${text}"
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
