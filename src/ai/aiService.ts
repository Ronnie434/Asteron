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
export type ChatIntentType =
    | 'create'
    | 'update'
    | 'delete'
    | 'query'
    | 'chat'
    | 'summary'        // User asks for summary/overview
    | 'suggest'        // AI provides proactive suggestions
    | 'batch_create'   // Create multiple items at once
    | 'batch_update'   // Update multiple items at once
    | 'reschedule';    // Reschedule overdue items

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
        repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
        repeatConfig?: string | null; // JSON string for custom repeat config
    };

    // For batch_create intent
    items?: Array<{
        title: string;
        type: ItemType;
        priority: ItemPriority;
        details?: string;
        dueAt?: string | null;
        remindAt?: string | null;
        repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
        repeatConfig?: string | null;
    }>;

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

    // Smart matching: When AI detects reference to existing item
    matchedItemId?: string;
    suggestUpdate?: boolean;  // AI unsure if update or create, suggest confirmation

    // Interactive questioning: For gathering missing parameters
    needsClarification?: boolean;
    missingFields?: ('priority' | 'dueAt' | 'remindAt' | 'type' | 'details')[];
    clarificationQuestion?: string;

    // For summary intent
    summaryData?: {
        overdueCount: number;
        todayCount: number;
        upcomingCount: number;
        byPriority: { high: number; med: number; low: number };
        message: string;
    };

    // For batch operations
    batchOperations?: {
        ids: string[];
        updates: {
            title?: string;
            dueAt?: string | null;
            remindAt?: string | null;
            priority?: ItemPriority;
            status?: 'active' | 'done' | 'archived';
        };
    }[];
}

/**
 * Extended item context for AI analysis
 */
export interface ItemContext {
    id: string;
    title: string;
    type: ItemType;
    priority?: ItemPriority;
    dueAt?: string | null;
    remindAt?: string | null;
    status?: string;
}

export interface AIService {
    transcribeAudio: (audioUri: string, format?: 'wav' | 'aac') => Promise<string>;
    analyzeText: (text: string) => Promise<AIAnalysisResult>;
    analyzeIntent: (text: string, existingItems?: ItemContext[]) => Promise<ChatIntentResult>;

    // For interactive questioning flow
    processFollowUpAnswer?: (
        pendingData: Partial<ChatIntentResult['itemData']>,
        missingFields: string[],
        userAnswer: string
    ) => Promise<{
        updatedData: Partial<ChatIntentResult['itemData']>;
        remainingFields: string[];
        nextQuestion?: string;
        complete: boolean;
    }>;
}

// Load API key from environment variables
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('⚠️ EXPO_PUBLIC_OPENROUTER_API_KEY is not set. Please create a .env file with your API key.');
}

// Model for audio transcription (needs multimodal support)
const TRANSCRIPTION_MODEL = 'google/gemini-2.0-flash-lite-001';

// Model for audio transcription (needs multimodal support)
const CHAT_MODEL = 'google/gemini-2.0-flash-lite-001';

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
                model: TRANSCRIPTION_MODEL,
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
- **CRITICAL TIME HANDLING**: If the user provides a specific time (e.g., "at 6pm") without a date:
  - If that time has **already passed** today, set the date to **TOMORROW**.
  - If that time is still in the future today, set the date to **TODAY**.
  - Example: If it's 7pm and user says "remind me at 6pm", set remindAt to 6pm TOMORROW.
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
                model: CHAT_MODEL,
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

    analyzeIntent: async (text: string, existingItems?: ItemContext[]): Promise<ChatIntentResult> => {
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

            // Build rich context about existing items for update/delete/query operations
            const itemsContext = existingItems && existingItems.length > 0
                ? `\nEXISTING ITEMS THE USER HAS:\n${existingItems.map(i => {
                    const parts = [`"${i.title}" (${i.type})`];
                    if (i.priority) parts.push(`priority: ${i.priority}`);
                    if (i.dueAt) parts.push(`due: ${i.dueAt}`);
                    if (i.status) parts.push(`status: ${i.status}`);
                    return `- ID: ${i.id} | ${parts.join(', ')}`;
                }).join('\n')}\n`
                : '\nNo existing items.\n';

            // Calculate stats for proactive queries
            const todayStr = now.toISOString().split('T')[0];
            const stats = existingItems ? {
                total: existingItems.length,
                overdue: existingItems.filter(i => i.dueAt && i.dueAt < localIso && i.status !== 'done').length,
                today: existingItems.filter(i => i.dueAt?.startsWith(todayStr)).length,
                highPriority: existingItems.filter(i => i.priority === 'high' && i.status !== 'done').length,
            } : { total: 0, overdue: 0, today: 0, highPriority: 0 };

            const statsContext = `\nITEM STATISTICS:\n- Total active items: ${stats.total}\n- Overdue items: ${stats.overdue}\n- Due today: ${stats.today}\n- High priority pending: ${stats.highPriority}\n`;

            const prompt = `You are a dedicated Executive Assistant and Personal Secretary called Asteron.
Your goal is to be helpful, strictly organized, and aware of the user's entire schedule.

**STRICT CONTENT BOUNDARIES:**
- You are NOT a general purpose AI assistant.
- DO NOT answer questions about coding, history, science, creative writing, math, or general trivia.
- DO NOT generate poems, stories, or code.
- If the user asks about anything unrelated to managing their tasks/items, politely REFUSE.
- Example refusal: "I'm focused on managing your schedule and tasks. I can't help with general questions."
- EXCEPTION: You may answer questions specifically about the user's own data (e.g. "How many tasks do I have?").

**PERSONA & TONE:**
- You are professional, concise, and capable.
- You "know everything" about the user's list. Demonstrate this awareness appropriately.
- When creating items, occasionally (but briefly) reference the user's workload if relevant.
  - Example: "Added. You now have 5 tasks for today."
  - Example: "Scheduled. Note that you have another meeting at the same time."

CURRENT TIME: ${localIso}
TIMEZONE: ${timezone}
${itemsContext}
${statsContext}

Analyze the user's message and determine their intent.

INTENT TYPES:
- "create": User wants to create a new task, reminder, note, or bill
    - "update": User wants to modify an existing item OR is referring to an existing item(add time, change date, etc.)
        - "delete": User wants to remove an existing item
            - "query": User is asking about their items(what's due, what's overdue, etc.)
                - "summary": User asks for an overview("What do I have today?", "Give me a summary", "What's on my plate?")
                    - "suggest": User asks for recommendations("What should I focus on?", "What's most important?")
                        - "chat": General conversation, greeting, thanks, or unclear intent

                            ** CRITICAL: SMART MATCHING FOR EXISTING ITEMS **
                                When the user mentions something that sounds like an existing item:
1. Check the EXISTING ITEMS list carefully
2. If you find a match(exact or fuzzy - e.g., "dentist" matches "Dentist appointment"), return:
- intent: "update"(NOT "create")
    - matchedItemId: the ID of the matched item
        - updates: the changes to make
            - searchQuery: keywords used to match
3. If you're unsure whether to update or create new, set:
    - suggestUpdate: true(let the app ask the user)
        - matchedItemId: the best matching item's ID
4. Examples:
- User says "remind me about my dentist at 3pm", existing item "Dentist appointment" exists → UPDATE
    - User says "change grocery shopping to tomorrow" → UPDATE
        - User says "buy milk today" with no existing match → CREATE

            ** CRITICAL: AGGRESSIVE INFORMATION EXTRACTION **
                You MUST extract ALL information from the user's message in ONE pass:
1. Parse EVERYTHING the user mentions:
- Time mentions: "at 6:30", "3pm", "tomorrow morning", etc.
   - Repeat patterns: "every day", "daily", "each morning", "weekly", etc.
   - Reminder offsets: "remind me 20 minutes before", "10 min ahead", "an hour early"
    - Priority hints: "urgent", "important", "when I get a chance", etc.
2. NEVER ask for information the user already provided(even partially or implicitly)
3. If user says "schedule it for 6:30 every day, remind me 20 minutes before":
- dueAt = today at 6: 30 PM(or tomorrow if past)
    - repeat = "daily"
        - remindAt = dueAt minus 20 minutes
            - DO NOT ask any follow - up questions - you have everything!

**MINIMAL QUESTIONING - ONLY WHEN TRULY MISSING**
Only set needsClarification: true when:
1. The user's message is genuinely ambiguous (e.g., "add a task" with no details)
2. Critical info is completely absent AND cannot be reasonably inferred
3. **CRITICAL EXCEPTION:** See "TITLE VALIDATION" below.
4. NEVER ask about info the user already gave, even in different words

** TITLE VALIDATION (CRITICAL) **
If the extracted title is generic (e.g. "Task", "Reminder", "Todo", "Note", "Something"), you MUST treat it as MISSING info.
- Example: "Create a reminder for 5pm" -> intent: create, needsClarification: true, question: "What is the reminder for?"
- Example: "Add a task" -> intent: create, needsClarification: true, question: "What is the task?"
- DO NOT create items named "Reminder" or "Task". Ask for clarification.

When you DO need to ask:
1. Ask ONE question max
2. If user provides a time/schedule, DO NOT ask "When do you need this done by?"
3. If user mentions "remind me before X", DO NOT ask about reminders
4. Make questions specific: "Should this be high, medium, or low priority?" NOT vague

    ** FOR SUMMARY / QUERY INTENTS:**
        When user asks about their data:
- Provide a helpful, conversational summary in responseText
    - Include relevant statistics
        - Mention specific items when helpful
            - For "summary" intent, populate summaryData object

                ** RESPONSE RULES:**
                    1. Always provide a friendly, conversational responseText
2. For "create": Extract item details(title, type, priority, dates, repeat pattern)
3. For "update": Provide matchedItemId OR searchQuery, plus updates to apply
4. For "delete": Provide matchedItemId OR searchQuery
5. Be proactive - if user asks what they should do, give actionable advice based on their items
6. DEFAULT to creating items without asking questions - users prefer speed over perfection

    ** REPEAT PATTERN DETECTION:**
        - "everyday" / "daily" / "each day" -> repeat: "daily"
            - "every week" / "weekly" / "every Monday" -> repeat: "weekly"
                - "every month" / "monthly" / "on the 1st of every month" -> repeat: "monthly"
                    - "every year" / "yearly" / "annually" -> repeat: "yearly"
                        - No repeat mentioned -> repeat: "none"

                            ** CRITICAL DATE / TIME HANDLING:**
                                - If user provides a time(e.g., "at 10:30 AM") without a specific date:
- If that time is still in the future TODAY, set remindAt to TODAY at that time
    - If that time has ALREADY PASSED today, set remindAt to TOMORROW at that time
        - dueAt = when the actual event / task occurs
            - remindAt = when to send the notification(may be different from dueAt if user wants advance warning)

** REMINDER OFFSET HANDLING:**
    - If user says "remind me X minutes/hours before", SUBTRACT that time from the event time
        - If user says "remind me at [time]" with no offset, set remindAt to that exact time
            - If no reminder preference specified, set remindAt = dueAt(or event time)
                - For repeating tasks, set BOTH dueAt(event time) AND remindAt(notification time)

                    ** MULTIPLE ITEMS IN ONE MESSAGE:**
                        When user mentions multiple items(e.g., "add buy groceries and call mom"):
1. Set intent: "batch_create"
2. Use the "items" array(NOT "itemData") to return ALL items
3. Each item in the array should have its own title, type, priority, dates, etc.
4. Extract as much info as possible for each item
5. Response text should confirm ALL items being created

Return ONLY valid JSON:
{
    "intent": "create" | "batch_create" | "update" | "delete" | "query" | "summary" | "suggest" | "chat",
        "confidence": 0.0 to 1.0,
            "responseText": "string - friendly message to show user",

                "itemData": { // for single item create intent
        "title": "string (max 60 chars, verb-first)",
            "type": "task" | "bill" | "reminder" | "followup" | "note",
                "priority": "low" | "med" | "high",
                    "details": "original text",
                        "dueAt": "ISO 8601 | null",
                            "remindAt": "ISO 8601 | null",
                                "repeat": "none" | "daily" | "weekly" | "monthly" | "yearly",
                                    "repeatConfig": "null (reserved for custom repeat patterns)"
    },

    "items": [ // for batch_create intent - array of items
        {
            "title": "string",
            "type": "task" | "bill" | "reminder" | "followup" | "note",
            "priority": "low" | "med" | "high",
            "details": "string",
            "dueAt": "ISO 8601 | null",
            "remindAt": "ISO 8601 | null",
            "repeat": "none" | "daily" | "weekly" | "monthly" | "yearly"
        }
    ],

        "matchedItemId": "string - ID of matched existing item", // for update/delete when match found
            "searchQuery": "string - keywords to find item", // fallback for update/delete
                "suggestUpdate": true | false, // set true if unsure whether to update or create

                    "updates": { // for update intent
        "title": "new title | undefined",
            "dueAt": "ISO 8601 | null | undefined",
                "remindAt": "ISO 8601 | null | undefined",
                    "priority": "low | med | high | undefined",
                        "status": "done | undefined"
    },

    "needsClarification": true | false,
        "missingFields": ["priority", "dueAt", ...],
            "clarificationQuestion": "What priority should this be?",

                "summaryData": { // for summary intent
        "overdueCount": number,
            "todayCount": number,
                "upcomingCount": number,
                    "byPriority": { "high": number, "med": number, "low": number },
        "message": "summary text"
    }
}

USER MESSAGE:
"${text}"
`;

            const body = {
                model: CHAT_MODEL,
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
                    "Authorization": `Bearer ${OPENROUTER_API_KEY} `,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://asteron.app",
                    "X-Title": "Asteron",
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} ${errText} `);
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
    },

    /**
     * Process a follow-up answer from the user during multi-turn item creation
     */
    processFollowUpAnswer: async (
        pendingData: Partial<ChatIntentResult['itemData']>,
        missingFields: string[],
        userAnswer: string
    ): Promise<{
        updatedData: Partial<ChatIntentResult['itemData']>;
        remainingFields: string[];
        nextQuestion?: string;
        complete: boolean;
    }> => {
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

            const prompt = `You are helping complete an item creation. The user is answering a follow-up question.

CURRENT TIME: ${localIso}
TIMEZONE: ${timezone}

PENDING ITEM DATA:
${JSON.stringify(pendingData, null, 2)}

MISSING FIELDS THAT STILL NEED VALUES: ${JSON.stringify(missingFields)}

USER'S ANSWER: "${userAnswer}"

TASK:
1. Parse the user's answer to extract the value for the first missing field
2. If they provided a value, update the data
3. If more fields are missing, generate the next question
4. If all fields are filled, mark as complete

PARSING RULES:
- For "priority": "high" / "urgent" / "important" = "high", "low" / "not urgent" / "whenever" = "low", else = "med"
- For "dueAt"/"remindAt": Parse dates relative to NOW (${localIso}), output ISO 8601
- For "type": task/bill/reminder/followup/note based on context

Return ONLY valid JSON:
{
  "updatedData": { /* merged data with the new value */ },
  "remainingFields": [ /* fields still missing */ ],
  "nextQuestion": "string - next question to ask, or null if complete",
  "complete": true | false
}`;

            const body = {
                model: CHAT_MODEL,
                messages: [{ role: "user", content: prompt }],
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
            console.error('Follow-up processing failed:', error);
            // Fallback: just mark as complete with existing data
            return {
                updatedData: pendingData as Partial<ChatIntentResult['itemData']>,
                remainingFields: [],
                complete: true,
            };
        }
    }
};
