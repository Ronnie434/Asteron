import { ItemType, ItemPriority } from '../db/items';
import * as FileSystem from 'expo-file-system/legacy';
import { safeIsoDate } from '../utils/dateUtils';

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
 * Enhanced with AI Super Powers for comprehensive task management.
 */
export type ChatIntentType =
    | 'create'
    | 'update'
    | 'delete'
    | 'query'
    | 'chat'
    | 'summary'                  // User asks for summary/overview
    | 'suggest'                  // AI provides proactive suggestions
    | 'batch_create'             // Create multiple items at once
    | 'batch_update'             // Update multiple items at once
    | 'batch_delete'             // Delete multiple items at once
    | 'reschedule'               // Reschedule overdue items
    // AI Super Powers - New Intents
    | 'delete_occurrence'        // Delete specific occurrence of repeating item
    | 'batch_delete_occurrence'  // Delete all items on a specific date
    | 'bulk_reschedule'          // Move items from one date to another
    | 'bulk_complete'            // Mark multiple items as done
    | 'conditional_delete'       // Delete items matching criteria
    | 'archive_completed'        // Archive completed items
    | 'analytics'                // Usage statistics and insights
    | 'quick_action';            // Voice shortcuts (done, snooze, tomorrow)

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

    // Chain of Thought for verification
    reasoning?: string;

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

    // For single occurrence completion (repeating tasks)
    occurrenceDate?: string; // ISO Date string (YYYY-MM-DD)

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

    // ============================================
    // AI SUPER POWERS - Enhanced Fields
    // ============================================

    // For date-targeted operations (delete_occurrence, batch_delete_occurrence, bulk_complete)
    targetDate?: string;        // ISO date YYYY-MM-DD for single date operations
    targetDateEnd?: string;     // For date range operations
    occurrenceItems?: Array<{   // Multiple items with specific occurrence dates
        itemId: string;
        occurrenceDate: string;
    }>;

    // For bulk_reschedule intent
    rescheduleConfig?: {
        fromDate?: string;      // Source date (YYYY-MM-DD)
        toDate: string;         // Destination date (YYYY-MM-DD)
        timeOffset?: number;    // Offset in minutes (e.g., +2 days = 2880)
        preserveTime?: boolean; // Keep original time of day
    };

    // For conditional operations (conditional_delete, archive_completed)
    filterCriteria?: {
        types?: ItemType[];
        priorities?: ItemPriority[];
        hasNoDueDate?: boolean;
        isOverdue?: boolean;
        isCompleted?: boolean;
        olderThan?: string;     // ISO date - items updated before this
        titleContains?: string; // Fuzzy title match
    };

    // For dependency awareness (#6)
    dependsOn?: string;         // ID of prerequisite item
    blockedBy?: string[];       // IDs of blocking items

    // For analytics intent (#11)
    analyticsData?: {
        completionRate: number;
        avgPerDay: number;
        totalCompleted: number;
        totalPending: number;
        byType: Record<string, number>;
        byPriority: Record<string, number>;
        streaks: { current: number; best: number };
        insights: string[];     // AI-generated insights
    };

    // For quick_action intent (#12) - Voice shortcuts
    quickAction?: 'complete_last' | 'snooze' | 'reschedule_tomorrow' | 'undo_last';

    // For context preservation (#13) - Reference to previous context
    referenceContext?: 'last_mentioned' | 'last_created' | 'last_completed';

    // For proactive conflict detection (#16)
    conflicts?: Array<{
        itemId: string;
        itemTitle: string;
        conflictType: 'time_overlap' | 'same_time' | 'too_close' | 'overbooked';
        conflictTime: string;
    }>;

    // For proactive suggestions (#7)
    proactiveSuggestion?: {
        type: 'reschedule_overdue' | 'create_routine' | 'optimize_schedule' | 'reminder_pattern';
        message: string;
        suggestedActions?: string[];
    };

    // For template/routine creation (#9)
    templateData?: {
        templateName: string;
        items: Array<{
            title: string;
            type: ItemType;
            priority: ItemPriority;
            offsetMinutes?: number; // Offset from first item
        }>;
    };
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
    analyzeIntent: (
        text: string,
        existingItems?: ItemContext[],
        upcomingSchedule?: string,
        chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    ) => Promise<ChatIntentResult>;

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
            // GUARDIAL: Skip parsing for empty/noise input
            if (!text || text.trim().length < 2 || /^(um+|uh+|hmm+|…|\.+|,|\[silence\]|\[unclear\])+$/i.test(text.trim())) {
                // console.log('[AI Service] Skipping empty/noise input:', text);
                return {
                    title: 'Empty Input',
                    type: 'note',
                    priority: 'low',
                    confidence: 0,
                    details: text || '',
                    needsClarification: false
                };
            }

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

            const prompt = `SYSTEM:
You are an information extraction engine for a personal task/reminder/bill/follow-up app.
Your job is NOT to chat. Your job is to output EXACTLY ONE JSON object that follows the schema.
Return ONLY valid minified JSON (no markdown, no commentary, no trailing commas).

HARD CONSTRAINTS (must follow)
- Output MUST be valid JSON using double quotes.
- Output MUST contain ONLY the exact keys in the schema. No additional keys.
- Never invent facts (dates, times, people, amounts). If missing, set null and needsClarification=true.
- If the input is empty/whitespace/noise, output a "note" with very low confidence and no dates.
- Prefer correctness over guessing. If unsure, leave dueAt/remindAt null and flag clarification.
- Use the user's local time context:
  - USER_TIMEZONE: ${timezone}
  - NOW (local ISO): ${localIso}
- All returned timestamps MUST be ISO 8601 with timezone offset (e.g., 2026-01-05T17:00:00-08:00). If you cannot determine the exact timestamp reliably, return null.

TASK: Extract a SINGLE best actionable item from the user's input.
- If multiple items exist, choose the most urgent/time-bound.
- If the user is clearly just talking, thinking aloud, or asking a question with no action, use type="note".

NORMALIZATION
- Clean up transcription noise but keep meaning in "details".
- Title: short, verb-first, max 60 chars. For bills use "Pay <bill name>" when possible.

TYPE SELECTION (choose one)
- "bill": any payment/subscription/fee/rent/credit card/insurance/taxes
- "followup": call/email/text/reply/ask/check-in with a person/company
- "reminder": explicit "remind me" / "make sure I..." / alert-focused phrasing
- "task": actionable to-do (non-payment) with a verb
- "note": default when unclear, non-actionable, idea, question, gibberish, or missing an actionable verb

PRIORITY
- high: bills, hard deadlines, legal/medical, "urgent/asap", due today/tomorrow, overdue language
- med: normal tasks/followups with some time relevance
- low: notes, ideas, someday/maybe, optional items

DATE & TIME EXTRACTION
Definitions:
- dueAt = when it must be done/paid.
- remindAt = when to notify.

Rules:
1) If the user gives an explicit due date/time → set dueAt.
2) If the user gives only a date (no time):
   - default remind time = 09:00 local
   - default due time:
     - bills: 23:59 local IF phrased like "by end of day" / "by EOD" / "before midnight"
     - otherwise: 17:00 local
3) If the user gives only a time (no date):
   - If that time is already past today relative to NOW → use TOMORROW at that time
   - Else → use TODAY at that time
4) Relative phrases mapping (unless user specifies exact time):
   - "morning" → 09:00
   - "noon/lunch" → 12:00
   - "afternoon" → 15:00
   - "evening/tonight" → 19:00
   - "end of day/EOD" → 23:59 (especially for bills)
5) If user says "remind me" time but no due time:
   - Put that time in remindAt.
   - If due is not stated, keep dueAt null unless a deadline is clearly implied.
6) If a dueAt exists and remindAt is missing:
   - Set remindAt to the earlier of:
     - dueAt minus 8 hours (for bills) OR minus 2 hours (for tasks/followups), but not earlier than NOW
     - otherwise default 09:00 on the due date if due date is in the future and time was defaulted
   - If that calculation would land in the past, set remindAt to NOW + 5 minutes.
7) Never set remindAt after dueAt. If conflict, move remindAt earlier (NOW + 5 minutes if needed).

REPEATING / RECURRENCE
- If the user indicates recurrence (e.g., "every month on the 28th", "weekly", "every Friday", "annually"):
  - Compute dueAt/remindAt as the NEXT valid future occurrence after NOW.
  - Put the recurrence phrase into "details" verbatim.
  - If recurrence rule is unclear (e.g., "every month" but no day) → needsClarification=true and clarificationReason="missing_date".

CLARIFICATION FLAGS (do NOT ask questions)
Set needsClarification=true when:
- missing_date: user implies a deadline/reminder but provides no usable date/time
- missing_person: followup implied but no person/company identified
- missing_amount: bill implied and user explicitly asks to pay a specific amount but amount is missing/unclear
- ambiguous_action: unclear what the action is
- other: anything else that blocks reliable scheduling

CONFIDENCE (0.0–1.0)
Use these guidelines:
- 0.90–1.00: clear action + clear date/time (+ type obvious)
- 0.65–0.89: clear action but partial time info or mild ambiguity
- 0.35–0.64: action somewhat clear but scheduling unclear or type uncertain
- 0.00–0.34: mostly noise / non-actionable / heavy ambiguity (likely "note")

OUTPUT SCHEMA (exact keys, exact types)
{
  "title": "string (max 60 chars)",
  "type": "task" | "bill" | "reminder" | "followup" | "note",
  "priority": "low" | "med" | "high",
  "confidence": number,
  "details": "string",
  "dueAt": "string (ISO 8601 w/ timezone offset) | null",
  "remindAt": "string (ISO 8601 w/ timezone offset) | null",
  "needsClarification": boolean,
  "clarificationReason": "missing_date" | "missing_person" | "missing_amount" | "ambiguous_action" | "other" | null
}

USER INPUT (may be empty, noisy, or partial):
"${text}"

Now produce ONLY the JSON object.`;

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

    analyzeIntent: async (
        text: string,
        existingItems?: ItemContext[],
        upcomingSchedule?: string,
        chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<ChatIntentResult> => {
        try {
            // GUARDIAL: Skip parsing for empty/noise input
            if (!text || text.trim().length < 2 || /^(um+|uh+|hmm+|…|\.+|,|\[silence\]|\[unclear\])+$/i.test(text.trim())) {
                // console.log('[AI Service] Skipping empty/noise intent:', text);
                return {
                    intent: 'chat',
                    confidence: 0,
                    responseText: "I didn't catch that. Could you say it again?",
                };
            }

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

            const todayStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

            // Build rich context about existing items for update/delete/query operations
            // NOTE: This is for ITEM LOOKUP only, not for schedule display!
            const itemsContext = existingItems && existingItems.length > 0
                ? `\n** ITEM REFERENCE DATABASE (For Update/Delete/Search ONLY - NOT for schedule display!) **\nWARNING: These dates are BASE dates. For schedule queries, use the UPCOMING SCHEDULE section instead.\n${existingItems.map(i => {
                    const parts = [`"${i.title}" (${i.type})`];
                    if (i.priority) parts.push(`priority: ${i.priority}`);
                    if (i.status) parts.push(`status: ${i.status}`);
                    return `- ID: ${i.id} | ${parts.join(', ')}`;
                }).join('\n')}\n`
                : '\nNo existing items.\n';

            // Calculate stats for proactive queries
            // Calculate stats for proactive queries using LOCAL time
            const nowTime = new Date();
            const todayStart = new Date(nowTime);
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);

            // Stats calculation for proactive context
            const stats = existingItems ? {
                total: existingItems.length,
                overdue: existingItems.filter(i => i.dueAt && new Date(safeIsoDate(i.dueAt)) < now && i.status !== 'done').length,
                today: existingItems.filter(i => {
                    if (!i.dueAt) return false;
                    const due = new Date(safeIsoDate(i.dueAt));
                    return due >= todayStart && due < tomorrowStart;
                }).length,
                highPriority: existingItems.filter(i => i.priority === 'high' && i.status !== 'done').length,
            } : { total: 0, overdue: 0, today: 0, highPriority: 0 };

            const statsContext = `\nITEM STATISTICS:\n- Total active items: ${stats.total}\n- Overdue items: ${stats.overdue}\n- Due today: ${stats.today}\n- High priority pending: ${stats.highPriority}\n`;

            const prompt = `You are the user's Chief of Staff and Private Executive Assistant (Asteron).
Your goal is to be proactive, highly organized, and authoritative about the user's schedule.

** CORE PERSONA: **
- You are NOT just a passive tool. You are a "Chief of Staff".
- You know the user's recurring commitments (bills, subscriptions) and overdue items.
- **Connect the dots**: If user says "pay bills", look at OVERDUE and RECURRING BILLS and list them.
- **De-duplicate**: If user adds "Netflix", check if "Netflix" already exists in RECURRING BILLS. If so, ask if they want to update it or log a payment.
- **Tone**: Professional, concise, efficient, "I've got this".
- **FULL DATABASE ACCESS**: You have permission to CREATE, UPDATE, and DELETE entries.
  - If user says "delete all done tasks", FIND them in the context and execute a "batch_delete".
  - If user says "change all high priority tasks to medium", execute a "batch_update".
  - Do NOT hesitate to perform bulk actions if the user's intent is clear.

** GOLDEN RULE: NEVER ASSUME - ALWAYS ASK **
This is the #1 most important rule. When in doubt, ASK the user. It is ALWAYS better to ask one clarifying question than to make a wrong assumption.

** WHEN TO ASK FOR CLARIFICATION (MANDATORY) **
1. **Multiple options exist** → ALWAYS present the options and ask user to choose
   - "Did you mean task, reminder, or bill?"
   - "I found 3 items matching that. Which one: [A], [B], or [C]?"
   
2. **Item type is unclear** → ASK before creating
   - Types: task, reminder, bill, followup, note
   - "add call mom" → "Should I add this as a task, reminder, or follow-up?"
   - "Netflix" → "Is this a bill, task, or something else?"
   - ONLY auto-detect if EXPLICITLY stated: "remind me" = reminder, "pay $X" = bill, "note:" = note
   
3. **Date/time is ambiguous** → CONFIRM the specific date
   - "Friday" → "Do you mean this Friday, January 3rd?"
   - "next week" → "Which day next week?"
   - "later" → "When would you like to be reminded?"
   
4. **Reference is unclear** → ASK what they mean
   - "delete it" but nothing obvious → "Which item would you like to delete?"
   - "change that" but unclear → "Which item should I change?"
   
5. **Before destructive actions** → CONFIRM first
   - Deleting multiple items → "This will delete X items. Are you sure?"
   - Bulk operations → Confirm the scope

** BEST PRACTICES **
- It's BETTER to ask one question than create the wrong item
- Users PREFER being asked over having to fix mistakes later
- When you see 2+ possible interpretations, ASK which one
- NEVER pick randomly when multiple items match
- Short, clear questions are best: "Task or reminder?" NOT long explanations

** SELF-VALIDATION: CHECK YOUR WORK **
Before finalizing ANY action, verify:
1. Did I correctly understand what the user asked for?
2. If I'm creating something - do I have the TYPE confirmed (not assumed)?
3. If I'm referencing "that" or "it" - did I check chat history to confirm what it means?
4. If there were multiple interpretations - did I ask the user to choose?
5. For dates - am I using the NEXT occurrence, not a past date?

If any answer is "no" or "unsure" → ASK for clarification instead of proceeding.

** CONVERSATION CONTEXT - CRITICAL: USE THE CHAT HISTORY **
You have access to the chat history below. This is ESSENTIAL for understanding the user.

** PRONOUN RESOLUTION - MANDATORY **
When user says: "that", "it", "the one", "this", "keep that as", "change it to", "make it":
1. LOOK AT THE CHAT HISTORY to find what they're referring to
2. If you just created/mentioned an item, "that" = that item
3. Example conversation:
   - AI: "I've added a note: Find HomeOwner insurance"
   - User: "Keep that as Task for Tuesday"
   - You MUST understand "that" = "Find HomeOwner insurance" (the note just created)
   - You should UPDATE the note to be a task, NOT ask "What is the task?"

** NEVER ASK "WHAT IS THE TASK?" if the user just referred to something in the chat! **
- Look at what was just created/discussed and UPDATE it instead
- "Keep that as X" = Change the last item's type to X
- "Make it Y" = Update the last item
- "Change it to Z" = Modify the last discussed item

USE THE CHAT HISTORY TO:
- Remember what items were just created/mentioned
- Resolve pronouns ("that", "it", "the one")
- Understand follow-up questions
- Track the flow of conversation
- Avoid repeating yourself

${chatHistory && chatHistory.length > 0 ? `
CHAT HISTORY (Most recent conversation - USE THIS!):
${chatHistory.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
` : '(No prior messages in this session)'}

** CONTEXT SECTIONS EXPLAINED: **
1. **OVERDUE ITEMS**: Tasks/Bills that are past due. PRIORITIZE THESE.
2. **ACTIVE RECURRING BILLS**: The user's fixed financial commitments. USE THIS TO PREVENT DUPLICATES.
3. **UPCOMING SCHEDULE**: The calculated truth of what is happening next.

6. CURRENT TIME: ${localIso}
7. TODAY IS: ${todayStr}
8. TOMORROW IS: ${tomorrowStr}
9. TIMEZONE: ${timezone}
10. ${itemsContext}
11. ${statsContext}
12. ${upcomingSchedule || ''}

** CRITICAL SCHEDULE RULES (ZERO SKIPPING POLICY) **
1. For ANY schedule query ("Tomorrow", "Next 3 days", "This week"):
   - You MUST check the "UPCOMING SCHEDULE" section.
   - Each line in UPCOMING SCHEDULE starts with [YYYY-MM-DD] - USE THIS DATE as the source of truth.
   - **STRICT DATE MATCHING**: Match the [YYYY-MM-DD] prefix EXACTLY to determine which date an item belongs to.
   - Example: "[2026-01-05] Mon, Jan 5, 2026 [9:00 AM]: Task Name" means this task is ONLY on 2026-01-05 (Monday Jan 5th).
   - DO NOT place items on dates that don't match their [YYYY-MM-DD] prefix.
   - If no items have the matching [YYYY-MM-DD] for a date, say "You have nothing scheduled for [Date]."
   - DO NOT summarize (e.g. do not say "and 2 other items"). List them all.
   - DO NOT invent or duplicate items. Only list items that appear in UPCOMING SCHEDULE.
2. The "UPCOMING SCHEDULE" is the ONLY authoritative source for schedule queries. Ignore EXISTING ITEMS for schedule display.

** CRITICAL: DAY NAME = NEXT UPCOMING OCCURRENCE ONLY **
When user says a DAY NAME (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday):
- ALWAYS interpret as the NEXT UPCOMING occurrence of that day
- NEVER show past dates
- "Friday" = the next Friday FROM TODAY (${todayStr})
- If today IS that day name, it means TODAY
- NEVER list PAST dates unless user explicitly says "last Friday" or similar
- IMPORTANT: Calculate the correct date by counting forward from TODAY
- Do NOT rely on memorized dates - calculate from the current date provided above

** RESPONSE FORMATTING **
1. Use a clean, "Executive Briefing" style.
2. Group items clearly by Date (e.g., "📅 **Tomorrow, Dec 30**").
3. Items in the context already have priority labels like "(High)" or "(Medium)". Preserve them.
4. Format: "• [Time] Task Name (Priority)"
5. **DEDUPLICATION:** If you see the exact same task listed twice for the same time, ONLY list it once.

Analyze the user's message and determine their intent.

INTENT TYPES (Core):
- "create": User wants to create a new task, reminder, note, or bill
- "batch_create": User wants to create MULTIPLE items at once
- "update": User wants to modify an existing item
- "batch_update": User wants to modify MULTIPLE items at once
- "delete": User wants to remove ONE existing item
- "batch_delete": User wants to remove MULTIPLE items by ID
- "query": User is asking about their items
- "summary": User asks for an overview
- "suggest": User asks for recommendations OR you want to proactively suggest
- "chat": General conversation, greeting, thanks, or unclear intent

** AI SUPER POWERS - Advanced Intents **

- "delete_occurrence": Delete a SPECIFIC occurrence of a repeating item (NOT the whole series)
  Examples: "Cancel gym on Friday", "Remove tomorrow's meeting", "Skip dentist next week"
  REQUIRED: matchedItemId + targetDate (YYYY-MM-DD format)

- "batch_delete_occurrence": Delete ALL items on a specific date
  Examples: "Clear everything on Friday", "Delete all items from tomorrow", "Remove all January 5th tasks"
  IMPORTANT: ONLY use this when user says "all", "everything", "clear the day". 
  If user names SPECIFIC items (e.g., "delete Call Mom and Call Dad from Tuesday"), use "batch_delete" with matched IDs instead!
  REQUIRED: targetDate (YYYY-MM-DD format)
  
- "bulk_reschedule": Move items from one date to another
  Examples: "Move all Monday tasks to Tuesday", "Postpone Friday to next week", "Push back tomorrow's items by 2 days"
  REQUIRED: rescheduleConfig.fromDate + rescheduleConfig.toDate
  
- "bulk_complete": Mark multiple items as done
  Examples: "I finished everything today", "Mark all morning tasks done", "I did all my tasks yesterday"
  REQUIRED: targetDate (defaults to today if not specified)
  
- "conditional_delete": Delete items matching specific criteria
  Examples: "Delete all low priority items without a due date", "Remove all completed tasks", "Delete old notes from last month"
  REQUIRED: filterCriteria with at least one filter

- "archive_completed": Archive completed items (move to archive, not delete)
  Examples: "Archive old completed items", "Clean up done tasks from last month"
  OPTIONAL: filterCriteria.olderThan

- "analytics": Provide usage statistics and insights
  Examples: "How am I doing?", "What's my completion rate?", "Show me my stats", "How productive was I this week?"
  REQUIRED: Generate analyticsData from context

- "quick_action": Voice shortcuts for fast actions
  Examples: "Done" / "Do it" → complete_last, "Not now" / "Later" → snooze, "Tomorrow" → reschedule_tomorrow
  REQUIRED: quickAction field

** SUPER POWER DETECTION RULES **
1. Date-specific deletion = delete_occurrence or batch_delete_occurrence (NOT batch_delete)
2. "Cancel X on [date]" or "Skip X on [date]" = delete_occurrence
3. "Clear [date]" or "Delete everything on [date]" = batch_delete_occurrence
4. "Move [date] to [date]" = bulk_reschedule
5. "I did/finished [all/everything] [today/date]" = bulk_complete
6. "Delete all [adjective] items" with conditions = conditional_delete
7. Single word responses after mentioning a task: "Done", "Later", "Tomorrow" = quick_action

** CONTEXT AWARENESS RULES **
- If user says "another one like that" → use referenceContext: "last_created"
- If user says "change IT to 3pm" → use referenceContext: "last_mentioned"
- If user says "done" after discussing a task → use quickAction: "complete_last"

** PROACTIVE SUGGESTIONS **
When appropriate, add proactiveSuggestion to ANY intent:
- If 5+ items overdue → suggest: "reschedule_overdue"
- If user adds same thing repeatedly (gym Mon/Wed/Fri) → suggest: "create_routine"
- If 3+ items at same time slot → suggest: "optimize_schedule"

** CONFLICT DETECTION **
When creating or updating items with specific times:
- Check if same time already has 2+ items
- If conflict detected, add to "conflicts" array
- Still create the item, but warn user in responseText

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

                            ** REPEATING TASKS COMPLETION **
                                - If user completes a SPECIFIC OCCURRENCE (e.g., "I did the gym today"):
                                - Set "intent": "update"
                                - Set "updates": { "status": "done" }
                                - Set "occurrenceDate": "YYYY-MM-DD" (The specific date of the occurrence)
                                - DO NOT set status='done' without occurrenceDate for repeating tasks, or you will kill the whole series.

                            ** SMART RESCHEDULING **
                                If the user updates the 'dueAt' (Time/Date), you MUST check if there is an existing 'remindAt'.
                                - If yes, CALCULATE the new 'remindAt' by preserving the original offset (e.g. 30 mins before).
                                - Example: Task due 3:00 PM (Reminder 2:30 PM). Move to 5:00 PM -> New Reminder 4:30 PM.
                                - Include this calculated 'remindAt' in the updates object.

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
                    - CRITICAL: You MUST calculate the specific valid ISO 8601 date for the next occurrence.
                    - Example: If "every month on the 28th" and today is the 30th, set dueAt to the 28th of NEXT MONTH.
                    - Do NOT return null for dueAt/remindAt just because it repeats. We need the first occurrence date.

                    ** MULTIPLE ITEMS IN ONE MESSAGE:**
                        When user mentions multiple items(e.g., "add buy groceries and call mom"):
1. Set intent: "batch_create"
2. Use the "items" array(NOT "itemData") to return ALL items
3. Each item in the array should have its own title, type, priority, dates, etc.
4. Extract as much info as possible for each item
5. Response text should confirm ALL items being created

Return ONLY valid JSON.
** CRITICAL: GENERATE THE "reasoning" FIELD FIRST to ensure accuracy. **
Structure:
{
    "reasoning": "Step 1: Check today's date in local time. Step 2: List items found in UPCOMING SCHEDULE. Step 3: Verify intent.",
    "intent": "create" | "batch_create" | "update" | "batch_update" | "delete" | "batch_delete" | "query" | "summary" | "chat",
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
    },

    // AI SUPER POWERS - Additional Fields
    "targetDate": "YYYY-MM-DD | null", // for delete_occurrence, batch_delete_occurrence, bulk_complete
    "targetDateEnd": "YYYY-MM-DD | null", // for date range operations
    
    "rescheduleConfig": { // for bulk_reschedule
        "fromDate": "YYYY-MM-DD",
        "toDate": "YYYY-MM-DD",
        "preserveTime": true | false
    },
    
    "filterCriteria": { // for conditional_delete, archive_completed
        "types": ["task", "bill", ...],
        "priorities": ["low", "med", "high"],
        "hasNoDueDate": true | false,
        "isOverdue": true | false,
        "isCompleted": true | false,
        "olderThan": "YYYY-MM-DD",
        "titleContains": "search string"
    },
    
    "quickAction": "complete_last" | "snooze" | "reschedule_tomorrow" | "undo_last",
    
    "analyticsData": { // for analytics intent - compute from context
        "completionRate": 0.0-1.0,
        "avgPerDay": number,
        "totalCompleted": number,
        "totalPending": number,
        "byType": { "task": n, "bill": n, ... },
        "byPriority": { "high": n, "med": n, "low": n },
        "streaks": { "current": n, "best": n },
        "insights": ["insight 1", "insight 2"]
    },
    
    "conflicts": [ // when scheduling conflicts detected
        { "itemId": "id", "itemTitle": "title", "conflictType": "same_time", "conflictTime": "ISO 8601" }
    ],
    
    "proactiveSuggestion": { // optional - add when helpful
        "type": "reschedule_overdue" | "create_routine" | "optimize_schedule",
        "message": "suggestion text",
        "suggestedActions": ["action 1", "action 2"]
    },
    
    "referenceContext": "last_mentioned" | "last_created" | "last_completed" // for context-aware responses
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
