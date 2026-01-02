/**
 * Brevo Email Service Helper
 * 
 * Provides utilities for sending transactional emails via Brevo API
 */

// Type declaration for Deno runtime (Supabase Edge Functions)
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: EmailRecipient;
}

/**
 * Send email via Brevo API
 * 
 * @param options Email configuration options
 * @returns Promise with send result
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');

  if (!brevoApiKey) {
    console.error('❌ BREVO_API_KEY not configured in environment');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  const defaultSender = {
    email: 'noreply@asteron.app',
    name: 'Asteron',
  };

  const payload = {
    sender: options.sender || defaultSender,
    to: options.to,
    subject: options.subject,
    htmlContent: options.htmlContent,
    textContent: options.textContent,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error:', responseData);
      return {
        success: false,
        error: responseData.message || 'Failed to send email',
      };
    }

    console.log('✅ Email sent successfully:', responseData.messageId);
    return {
      success: true,
      messageId: responseData.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending email via Brevo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate welcome email HTML content for Asteron Brief
 */
export function generateWelcomeEmail(firstName: string): { html: string; text: string } {
  const html = '<!DOCTYPE html><html lang="en" style="margin:0; padding:0; background:#f8f9fa;"><body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#f8f9fa; color:#1a1a1a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background:#fff; border-radius:16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);"><tr><td style="font-size:26px; font-weight:600; margin-bottom:20px; color:#1a1a1a;">Welcome, ' + firstName + ' 👋</td></tr><tr><td style="font-size:16px; line-height:1.7; color:#4a4a4a; padding-top:16px;">You have taken the first step toward calmer, more intentional days. <strong>Asteron Brief</strong> is here to help you see what is ahead — so you can prepare with confidence, not stress.</td></tr><tr><td style="padding-top: 32px;"><h3 style="font-size:18px; margin:0 0 14px 0; color:#1a1a1a;">Here is what you can do:</h3><ul style="padding-left:20px; margin-top:10px; font-size:16px; color:#4a4a4a; line-height:1.7;"><li>Get a personalized <strong>daily brief</strong> of your upcoming tasks and events</li><li>Capture thoughts and ideas on the fly with <strong>quick capture</strong></li><li>Let AI help you stay organized with gentle <strong>reminders</strong></li></ul></td></tr><tr><td style="padding-top: 24px; font-size:16px; color:#4a4a4a; line-height:1.7;">Take a moment to explore. Your calm forecast awaits.</td></tr><tr><td align="center" style="padding-top: 40px;"><a href="mailto:support@asteron.app?subject=Question%20About%20Asteron" style="background:#f0f0f0; color:#007AFF; padding:14px 28px; text-decoration:none; border-radius:10px; font-size:15px; font-weight:600; display:inline-block; border:1px solid #007AFF;">Contact Support</a></td></tr><tr><td style="padding-top: 20px; font-size:14px; color:#666; text-align:center;">Questions? We are always here to help.</td></tr><tr><td style="padding-top: 36px; font-size:16px; color:#1a1a1a; font-weight:600;">Here is to calmer days,<br>The Asteron Team</td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin-top:24px;"><tr><td style="text-align:center; font-size:12px; color:#888; line-height:1.5;">You are receiving this because you signed up for Asteron Brief.</td></tr></table></td></tr></table></body></html>';

  const text = 'Welcome, ' + firstName + '! 👋\n\nYou have taken the first step toward calmer, more intentional days. Asteron Brief is here to help you see what is ahead — so you can prepare with confidence, not stress.\n\nHere is what you can do:\n• Get a personalized daily brief of your upcoming tasks and events\n• Capture thoughts and ideas on the fly with quick capture\n• Let AI help you stay organized with gentle reminders\n\nTake a moment to explore. Your calm forecast awaits.\n\nQuestions? We are always here to help!\nContact us at: support@asteron.app\n\nHere is to calmer days,\nThe Asteron Team\n\n---\nYou are receiving this because you signed up for Asteron Brief.';

  return { html, text };
}

/**
 * Item type for brief emails
 */
interface BriefItem {
  id: string;
  title: string;
  type: string;
  due_at: string | null;
  remind_at: string | null;
  priority: string;
}

/**
 * Get icon emoji based on item type
 */
function getItemIcon(type: string): string {
  switch (type) {
    case 'bill': return '💰';
    case 'reminder': return '🔔';
    case 'event': return '🎂';
    default: return '⚡';
  }
}

/**
 * Format date for display
 */
function formatBriefDate(date: Date, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  if (timeZone) options.timeZone = timeZone;
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 */
function formatBriefTime(dateStr: string, timeZone?: string): string {
  const d = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (timeZone) options.timeZone = timeZone;
  return d.toLocaleTimeString('en-US', options);
}

/**
 * Get time-appropriate greeting
 */
function getGreeting(hour: number): { greeting: string; emoji: string } {
  if (hour < 12) {
    return { greeting: 'Good morning', emoji: '☀️' };
  } else if (hour < 17) {
    return { greeting: 'Good afternoon', emoji: '👋' };
  } else {
    return { greeting: 'Good evening', emoji: '🌙' };
  }
}

/**
 * Generate Daily Brief email HTML content
 */
export function generateDailyBriefEmail(firstName: string, items: BriefItem[], userTimezone: string = 'America/Los_Angeles'): { html: string; text: string; subject: string } {
  // Get current time in user's timezone
  const now = new Date();
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  const userHour = userDate.getHours();

  const dateStr = formatBriefDate(userDate);
  const { greeting, emoji } = getGreeting(userHour);
  const subject = emoji + " Your Day Ahead — " + dateStr;

  const tasks = items.filter(i => i.type === 'task');
  const bills = items.filter(i => i.type === 'bill');
  const reminders = items.filter(i => i.type === 'reminder');
  const events = items.filter(i => i.type === 'event');

  const renderItem = (item: BriefItem): string => {
    const time = item.due_at ? formatBriefTime(item.due_at, userTimezone) : (item.remind_at ? formatBriefTime(item.remind_at, userTimezone) : 'Today');
    return '<tr><td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="width: 30px; font-size: 16px;">' + getItemIcon(item.type) + '</td><td style="font-size: 15px; color: #1a1a2e;">' + item.title + '</td><td style="text-align: right; font-size: 13px; color: #64748b; white-space: nowrap;">' + time + '</td></tr></table></td></tr>';
  };

  const renderSection = (title: string, sectionItems: BriefItem[]): string => {
    if (sectionItems.length === 0) return '';
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);"><tr><td style="padding: 14px 16px; background: #f8fafc; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">' + title + '</td></tr>' + sectionItems.map(renderItem).join('') + '</table>';
  };

  const emptyMessage = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; text-align: center;"><tr><td style="padding: 32px; color: #64748b; font-size: 15px;">✨ You are all clear today! Take a breath.</td></tr></table>';

  const prioritiesSection = renderSection("Today's Priorities", [...tasks, ...bills]);
  const remindersSection = renderSection("Reminders", reminders);
  const eventsSection = renderSection("Events", events);
  const contentSection = (prioritiesSection + remindersSection + eventsSection) || emptyMessage;

  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0; padding:0; font-family:-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background:#f8fafc;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;"><tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 32px 24px;"><h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #fff;">' + emoji + ' ' + greeting + ', ' + firstName + '!</h1><p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9);">Here is your day at a glance.</p></td></tr><tr><td style="background: #f8fafc; padding: 24px;">' + contentSection + '</td></tr><tr><td style="background: #fff; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;"><p style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 15px; font-weight: 500;">Have a great day! ✨</p><p style="margin: 0; color: #64748b; font-size: 13px;">The Asteron Team</p></td></tr></table><p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">You are receiving this because you enabled Daily Brief in Asteron.</p></td></tr></table></body></html>';

  const textItems = items.map(i => '• ' + getItemIcon(i.type) + ' ' + i.title).join('\n');
  const textContent = textItems || '✨ You are all clear today!';
  const text = greeting + ', ' + firstName + '! ' + emoji + '\n\nHere is your day at a glance:\n\n' + textContent + '\n\nHave a great day!\nThe Asteron Team\n\n---\nYou are receiving this because you enabled Daily Brief in Asteron.';

  return { html, text, subject };
}

/**
 * Generate Weekly Brief email HTML content
 */
export function generateWeeklyBriefEmail(firstName: string, items: BriefItem[], userTimezone: string = 'America/Los_Angeles'): { html: string; text: string; subject: string } {
  // Get current time in user's timezone
  const now = new Date();
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));

  const endDate = new Date(userDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startStr = userDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const subject = "📅 Your Week Ahead — " + startStr + "–" + endStr;

  const taskCount = items.filter(i => i.type === 'task').length;
  const billCount = items.filter(i => i.type === 'bill').length;
  const reminderCount = items.filter(i => i.type === 'reminder').length;

  // Use YYYY-MM-DD as keys for proper sorting, store formatted name separately
  const dayGroups: Record<string, { displayName: string; items: BriefItem[] }> = {};

  items.forEach(item => {
    let itemDate: Date;
    let useTz = false;

    if (item.due_at || item.remind_at) {
      itemDate = new Date(item.due_at || item.remind_at || '');
      useTz = true;
    } else {
      itemDate = userDate;
    }

    // Use sortable date key (YYYY-MM-DD)
    const sortKey = itemDate.toLocaleDateString('en-CA', { timeZone: useTz ? userTimezone : undefined });
    const displayName = formatBriefDate(itemDate, useTz ? userTimezone : undefined);

    if (!dayGroups[sortKey]) dayGroups[sortKey] = { displayName, items: [] };
    dayGroups[sortKey].items.push(item);
  });

  const renderItem = (item: BriefItem): string => {
    const time = item.due_at ? formatBriefTime(item.due_at, userTimezone) : (item.remind_at ? formatBriefTime(item.remind_at, userTimezone) : '');
    return '<tr><td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="width: 28px; font-size: 14px;">' + getItemIcon(item.type) + '</td><td style="font-size: 14px; color: #1a1a2e;">' + item.title + '</td><td style="text-align: right; font-size: 12px; color: #64748b; white-space: nowrap;">' + time + '</td></tr></table></td></tr>';
  };

  const renderDaySection = (dayTitle: string, dayItems: BriefItem[]): string => {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.03);"><tr><td style="padding: 12px 16px; background: #f8fafc; font-size: 13px; font-weight: 600; color: #475569;">' + dayTitle + '</td></tr>' + dayItems.map(renderItem).join('') + '</table>';
  };

  const statsText = taskCount + ' task' + (taskCount !== 1 ? 's' : '') + ' · ' + billCount + ' bill' + (billCount !== 1 ? 's' : '') + ' · ' + reminderCount + ' reminder' + (reminderCount !== 1 ? 's' : '');

  // Sort by date key (YYYY-MM-DD sorts chronologically)
  const sortedDays = Object.entries(dayGroups).sort(([a], [b]) => a.localeCompare(b));
  const daySections = sortedDays.map(([_, { displayName, items }]) => renderDaySection(displayName, items)).join('');
  const emptyMessage = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; text-align: center;"><tr><td style="padding: 32px; color: #64748b; font-size: 15px;">🌴 Your week is wide open! Time to relax or plan something fun.</td></tr></table>';
  const contentSection = daySections || emptyMessage;

  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0; padding:0; font-family:-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background:#f8fafc;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;"><tr><td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 16px 16px 0 0; padding: 32px 24px;"><h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #fff;">📅 Hey ' + firstName + ', here is your week!</h1><p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.9);">' + statsText + '</p></td></tr><tr><td style="background: #f8fafc; padding: 24px;">' + contentSection + '</td></tr><tr><td style="background: #fff; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;"><p style="margin: 0 0 16px 0; color: #1a1a2e; font-size: 15px; font-weight: 500;">Here is to a productive week! 🚀</p><p style="margin: 0; color: #64748b; font-size: 13px;">The Asteron Team</p></td></tr></table><p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">You are receiving this because you enabled Weekly Brief in Asteron.</p></td></tr></table></body></html>';

  const textDays = sortedDays
    .map(([_, { displayName, items }]) => displayName + ':\n' + items.map((i: BriefItem) => '  • ' + getItemIcon(i.type) + ' ' + i.title).join('\n'))
    .join('\n\n');
  const textContent = textDays || '🌴 Your week is wide open!';
  const text = 'Hey ' + firstName + '! 📅\n\nHere is your week ahead (' + startStr + '–' + endStr + '):\n\n' + statsText + '\n\n' + textContent + '\n\nHere is to a productive week! 🚀\nThe Asteron Team\n\n---\nYou are receiving this because you enabled Weekly Brief in Asteron.';

  return { html, text, subject };
}
