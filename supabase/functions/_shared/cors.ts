/**
 * Shared CORS headers for Supabase Edge Functions
 * 
 * Used by all edge functions to handle cross-origin requests
 */

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
