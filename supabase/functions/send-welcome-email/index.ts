/**
 * Send Welcome Email Edge Function
 * 
 * Sends welcome email to OAuth users (Google/Apple) via Brevo
 * No confirmation link needed - they're already verified
 * 
 * Request Body:
 * {
 *   "email": string,
 *   "firstName": string
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "messageId": "abc123..."
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail, generateWelcomeEmail } from '../_shared/brevo.ts';

interface RequestBody {
    email: string;
    firstName?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Parse request body
        const { email, firstName = 'there' }: RequestBody = await req.json();

        if (!email) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Email address is required',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            );
        }

        console.log(`📧 Sending welcome email to: ${email}`);

        // Generate email content
        const { html, text } = generateWelcomeEmail(firstName);

        // Send email via Brevo
        const result = await sendEmail({
            to: [{ email, name: firstName }],
            subject: "Welcome to Asteron — Your Calm Forecast Awaits",
            htmlContent: html,
            textContent: text,
        });

        if (!result.success) {
            console.error('❌ Failed to send welcome email:', result.error);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: result.error || 'Failed to send email',
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                }
            );
        }

        console.log(`✅ Welcome email sent successfully to ${email}`);

        return new Response(
            JSON.stringify({
                success: true,
                messageId: result.messageId,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error) {
        console.error('❌ Error in send-welcome-email function:', error);
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
