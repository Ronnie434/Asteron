/**
 * Preference Sync Service
 * 
 * Syncs email brief preferences to Supabase for scheduled email delivery
 */

import { supabase } from './supabase';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuthStore } from '../store/useAuthStore';

export interface UserPreferences {
    daily_brief_enabled: boolean;
    daily_brief_time: string;
    weekly_brief_enabled: boolean;
    weekly_brief_day: number;
    weekly_brief_time: string;
    email?: string;
    first_name?: string;
    timezone?: string;
}

/**
 * Sync email preferences to Supabase
 * Only syncs for authenticated (non-guest) users
 */
export async function syncPreferences(): Promise<{ success: boolean; error?: string }> {
    const { user, isGuestMode } = useAuthStore.getState();

    if (isGuestMode || !user) {
        console.log('⏭️ Skipping preference sync - guest mode or no user');
        return { success: true };
    }

    const settings = useSettingsStore.getState();

    const preferences: UserPreferences = {
        daily_brief_enabled: settings.dailyBriefEnabled,
        daily_brief_time: settings.dailyBriefTime,
        weekly_brief_enabled: settings.weeklyBriefEnabled,
        weekly_brief_day: settings.weeklyBriefDay,
        weekly_brief_time: settings.weeklyBriefTime,
        email: user.email || undefined,
        first_name: user.user_metadata?.full_name?.split(' ')[0] ||
            user.user_metadata?.name?.split(' ')[0] ||
            undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
        const { error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: user.id,
                ...preferences,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (error) {
            console.error('❌ Failed to sync preferences:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Preferences synced successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Error syncing preferences:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Load preferences from Supabase
 * Called on app startup to sync cloud preferences to local
 */
export async function loadPreferences(): Promise<UserPreferences | null> {
    const { user, isGuestMode } = useAuthStore.getState();

    if (isGuestMode || !user) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No record found - that's okay for new users
                return null;
            }
            console.error('❌ Failed to load preferences:', error);
            return null;
        }

        return data as UserPreferences;
    } catch (error) {
        console.error('❌ Error loading preferences:', error);
        return null;
    }
}

/**
 * Subscribe to settings changes and auto-sync
 */
export function setupPreferenceSyncListener(): () => void {
    // Subscribe to relevant settings changes
    const unsubscribe = useSettingsStore.subscribe(
        (state, prevState) => {
            // Check if any email preference settings changed
            if (
                state.dailyBriefEnabled !== prevState.dailyBriefEnabled ||
                state.dailyBriefTime !== prevState.dailyBriefTime ||
                state.weeklyBriefEnabled !== prevState.weeklyBriefEnabled ||
                state.weeklyBriefDay !== prevState.weeklyBriefDay ||
                state.weeklyBriefTime !== prevState.weeklyBriefTime
            ) {
                // Debounce: sync after a short delay
                setTimeout(() => {
                    syncPreferences();
                }, 1000);
            }
        }
    );

    return unsubscribe;
}
