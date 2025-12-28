import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

const GUEST_MODE_KEY = 'isGuestMode';
const GUEST_NAME_KEY = 'guestName';

// Generate a random guest name
const generateGuestName = (): string => {
    const adjectives = ['Happy', 'Calm', 'Bright', 'Swift', 'Gentle', 'Wise', 'Kind', 'Bold'];
    const nouns = ['Star', 'Moon', 'Sky', 'Wave', 'Cloud', 'Light', 'Wind', 'Leaf'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
};

interface AuthState {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;
    isGuestMode: boolean;
    guestName: string;

    // Actions
    initialize: () => Promise<void>;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
    skipSignIn: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    isLoading: true,
    isInitialized: false,
    isGuestMode: false,
    guestName: 'Guest',

    initialize: async () => {
        try {
            // Check for guest mode first
            const [isGuest, storedGuestName] = await Promise.all([
                AsyncStorage.getItem(GUEST_MODE_KEY),
                AsyncStorage.getItem(GUEST_NAME_KEY),
            ]);

            if (isGuest === 'true') {
                set({
                    isGuestMode: true,
                    guestName: storedGuestName || generateGuestName(),
                    isLoading: false,
                    isInitialized: true,
                });
                return;
            }

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
                    isGuestMode: false,
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
            isGuestMode: false,
        });
    },

    skipSignIn: async () => {
        try {
            const guestName = generateGuestName();
            await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
            await AsyncStorage.setItem(GUEST_NAME_KEY, guestName);
            set({
                isGuestMode: true,
                guestName,
                session: null,
                user: null,
            });
        } catch (error) {
            console.error('Skip sign-in error:', error);
        }
    },

    signOut: async () => {
        try {
            set({ isLoading: true });

            // Clear guest mode
            await AsyncStorage.removeItem(GUEST_MODE_KEY);
            await AsyncStorage.removeItem(GUEST_NAME_KEY);

            // Sign out from Supabase if authenticated
            await supabase.auth.signOut();

            set({
                session: null,
                user: null,
                isLoading: false,
                isGuestMode: false,
                guestName: 'Guest',
            });
        } catch (error) {
            console.error('Sign out error:', error);
            set({ isLoading: false });
        }
    },
}));
