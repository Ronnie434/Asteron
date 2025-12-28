import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    initialize: () => Promise<void>;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    isInitialized: false,

    initialize: async () => {
        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            set({
                session,
                user: session?.user ?? null,
                isLoading: false,
                isInitialized: true,
            });

            // Listen for auth changes
            supabase.auth.onAuthStateChange((_event, session) => {
                set({
                    session,
                    user: session?.user ?? null,
                });
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false, isInitialized: true });
        }
    },

    setSession: (session) => {
        set({
            session,
            user: session?.user ?? null,
        });
    },

    signOut: async () => {
        try {
            set({ isLoading: true });
            await supabase.auth.signOut();
            set({ session: null, user: null, isLoading: false });
        } catch (error) {
            console.error('Sign out error:', error);
            set({ isLoading: false });
        }
    },
}));
