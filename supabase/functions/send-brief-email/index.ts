/**
 * Send Brief Email Edge Function
 * 
 * Sends daily or weekly brief emails to users via Brevo
 * Sender: noreply@asteron.app
 * 
 * Request Body:
 * {
 *   "type": "daily" | "weekly",
 *   "userId": "optional - for single user test"
 * }
 * 
 * For scheduled execution, call without userId to process all eligible users
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail, generateDailyBriefEmail, generateWeeklyBriefEmail } from '../_shared/brevo.ts';

interface RequestBody {
    type: 'daily' | 'weekly';
    userId?: string;
}

interface UserPreference {
    user_id: string;
    email: string;
    first_name: string;
    daily_brief_enabled: boolean;
    daily_brief_time: string;
    weekly_brief_enabled: boolean;
    weekly_brief_day: number;
    weekly_brief_time: string;
    timezone: string;
}

interface UserItem {
    id: string;
    title: string;
    type: string;
    due_at: string | null;
    remind_at: string | null;
    priority: string;
    status: string;
    repeat: string;
    completed_dates: string | string[] | null;
    skipped_dates: string | string[] | null;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { type, userId }: RequestBody = await req.json();

        if (!type || !['daily', 'weekly'].includes(type)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Invalid type. Must be "daily" or "weekly"',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            );
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log(`📧 Processing ${type} brief emails...`);

        // Query users with enabled preferences
        let query = supabase
            .from('user_preferences')
            .select('user_id, email, first_name, daily_brief_enabled, daily_brief_time, weekly_brief_enabled, weekly_brief_day, weekly_brief_time, timezone')
            .eq(type === 'daily' ? 'daily_brief_enabled' : 'weekly_brief_enabled', true);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) {
            console.error('❌ Error fetching user preferences:', usersError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Failed to fetch user preferences',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                }
            );
        }

        if (!users || users.length === 0) {
            console.log('ℹ️ No users found with enabled briefs');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No users to process',
                    emailsSent: 0,
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            );
        }

        console.log(`📋 Found ${users.length} user(s) to process`);

        let emailsSent = 0;
        const errors: string[] = [];

        // Process each user
        for (const user of users as UserPreference[]) {
            try {
                // Time Check Logic (Skip if userId is provided for testing)
                if (!userId) {
                    try {
                        const userTz = user.timezone || 'UTC';
                        const now = new Date();

                        // Parse current time in user's timezone
                        const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
                        const userHour = userDate.getHours();
                        const userMinute = userDate.getMinutes();
                        const userDay = userDate.getDay(); // 0 = Sunday

                        if (type === 'daily') {
                            const timeParts = user.daily_brief_time.split(':');
                            const prefHour = parseInt(timeParts[0], 10);
                            const prefMinute = parseInt(timeParts[1], 10);

                            // Check if current hour AND minute matches preferred time
                            if (userHour !== prefHour || userMinute !== prefMinute) {
                                // console.log(`Skipping ${user.email} (Current: ${userHour}:${userMinute}, Pref: ${prefHour}:${prefMinute})`);
                                continue;
                            }
                        } else {
                            // Weekly
                            const timeParts = user.weekly_brief_time.split(':');
                            const prefHour = parseInt(timeParts[0], 10);
                            const prefMinute = parseInt(timeParts[1], 10);
                            const prefDay = user.weekly_brief_day;

                            if (userHour !== prefHour || userMinute !== prefMinute || userDay !== prefDay) {
                                // console.log(`Skipping ${user.email} (Current: D${userDay} H${userHour}:${userMinute}, Pref: D${prefDay} H${prefHour}:${prefMinute})`);
                                continue;
                            }
                        }
                    } catch (timeError) {
                        console.error(`⚠️ Timezone error for ${user.email}:`, timeError);
                        // Continue processing? Or skip? Best to skip to avoid spam.
                        continue;
                    }
                }

                // Fetch user's items
                const today = new Date();
                const endDate = type === 'daily'
                    ? new Date(today.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
                    : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // Next week

                const { data: items, error: itemsError } = await supabase
                    .from('user_items')
                    .select('id, title, type, due_at, remind_at, priority, status, repeat, completed_dates, skipped_dates')
                    .eq('user_id', user.user_id)
                    .eq('status', 'active')
                    .or(`due_at.lte.${endDate.toISOString()},remind_at.lte.${endDate.toISOString()}`)
                    .order('due_at', { ascending: true });

                if (itemsError) {
                    console.error(`❌ Error fetching items for user ${user.user_id}:`, itemsError);
                    errors.push(`Failed to fetch items for ${user.email}`);
                    continue;
                }

                // Filter out completed recurring items
                const userItems = (items || []).filter(item => {
                    // 1. Check if explicit status is done
                    if (item.status === 'done') return false;

                    // 2. Check recurring completion
                    if (item.completed_dates && item.due_at) {
                        try {
                            let dates: string[] = [];
                            // Handle potential string/double-encoded JSON
                            if (typeof item.completed_dates === 'string') {
                                let parsed = JSON.parse(item.completed_dates);
                                if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                                dates = Array.isArray(parsed) ? parsed : [];
                            } else if (Array.isArray(item.completed_dates)) {
                                dates = item.completed_dates;
                            }

                            // Convert due_at to YYYY-MM-DD in User TZ
                            const d = new Date(item.due_at);
                            // en-CA gives YYYY-MM-DD
                            const dateStr = d.toLocaleDateString('en-CA', { timeZone: user.timezone });

                            if (dates.includes(dateStr)) return false;
                        } catch (e) {
                            console.error("Error parsing completed_dates for item", item.id, e);
                        }
                    }
                    return true;
                }) as UserItem[];

                // Skip if no items to report
                if (userItems.length === 0) {
                    console.log(`ℹ️ No items to report for ${user.email}`);
                    continue;
                }

                // Generate email content
                const { html, text, subject } = type === 'daily'
                    ? generateDailyBriefEmail(user.first_name || 'there', userItems, user.timezone)
                    : generateWeeklyBriefEmail(user.first_name || 'there', userItems, user.timezone);

                // Send email
                const result = await sendEmail({
                    to: [{ email: user.email, name: user.first_name }],
                    subject,
                    htmlContent: html,
                    textContent: text,
                });

                if (result.success) {
                    emailsSent++;
                    console.log(`✅ Sent ${type} brief to ${user.email}`);
                } else {
                    errors.push(`Failed to send to ${user.email}: ${result.error}`);
                }

            } catch (userError) {
                console.error(`❌ Error processing user ${user.user_id}:`, userError);
                errors.push(`Error processing ${user.email}`);
            }
        }

        console.log(`✅ Completed: ${emailsSent} email(s) sent`);

        return new Response(
            JSON.stringify({
                success: true,
                emailsSent,
                errors: errors.length > 0 ? errors : undefined,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('❌ Error in send-brief-email function:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
