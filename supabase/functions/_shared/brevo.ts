/**
 * Brevo Email Service Helper
 * 
 * Provides utilities for sending transactional emails via Brevo API
 */

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
    const html = `
    <!DOCTYPE html>
    <html lang="en" style="margin:0; padding:0; background:#f8f9fa;">
      <body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8f9fa; color:#1a1a1a;">
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              
              <!-- Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background:#fff; border-radius:16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                
                <tr>
                  <td style="font-size:26px; font-weight:600; margin-bottom:20px; color:#1a1a1a;">
                    Welcome, ${firstName} 👋
                  </td>
                </tr>

                <tr>
                  <td style="font-size:16px; line-height:1.7; color:#4a4a4a; padding-top:16px;">
                    You've taken the first step toward calmer, more intentional days. 
                    <strong>Asteron Brief</strong> is here to help you see what's ahead — 
                    so you can prepare with confidence, not stress.
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 32px;">
                    <h3 style="font-size:18px; margin:0 0 14px 0; color:#1a1a1a;">Here's what you can do:</h3>
                    <ul style="padding-left:20px; margin-top:10px; font-size:16px; color:#4a4a4a; line-height:1.7;">
                      <li>Get a personalized <strong>daily brief</strong> of your upcoming tasks and events</li>
                      <li>Capture thoughts and ideas on the fly with <strong>quick capture</strong></li>
                      <li>Let AI help you stay organized with gentle <strong>reminders</strong></li>
                    </ul>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 24px; font-size:16px; color:#4a4a4a; line-height:1.7;">
                    Take a moment to explore. Your calm forecast awaits.
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding-top: 40px;">
                    <a href="mailto:support@asteron.app?subject=Question%20About%20Asteron"
                       style="background:#f0f0f0; color:#007AFF; padding:14px 28px; text-decoration:none;
                              border-radius:10px; font-size:15px; font-weight:600; display:inline-block; border:1px solid #007AFF;">
                      Contact Support
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 20px; font-size:14px; color:#666; text-align:center;">
                    Questions? We're always here to help.
                  </td>
                </tr>

                <tr>
                  <td style="padding-top: 36px; font-size:16px; color:#1a1a1a; font-weight:600;">
                    Here's to calmer days,<br>
                    The Asteron Team
                  </td>
                </tr>

              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin-top:24px;">
                <tr>
                  <td style="text-align:center; font-size:12px; color:#888; line-height:1.5;">
                    You're receiving this because you signed up for Asteron Brief.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </body>
    </html>
  `;

    const text = `
Welcome, ${firstName}! 👋

You've taken the first step toward calmer, more intentional days. Asteron Brief is here to help you see what's ahead — so you can prepare with confidence, not stress.

Here's what you can do:
• Get a personalized daily brief of your upcoming tasks and events
• Capture thoughts and ideas on the fly with quick capture
• Let AI help you stay organized with gentle reminders

Take a moment to explore. Your calm forecast awaits.

Questions? We're always here to help!
Contact us at: support@asteron.app

Here's to calmer days,
The Asteron Team

---
You're receiving this because you signed up for Asteron Brief.
  `.trim();

    return { html, text };
}
