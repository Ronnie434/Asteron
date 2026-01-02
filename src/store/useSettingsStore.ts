import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
    quietHoursEnabled: boolean;
    quietHoursStart: string; // "22:00"
    quietHoursEnd: string;   // "07:00"
    dailyBriefEnabled: boolean;
    dailyBriefTime: string;  // "08:00"
    weeklyBriefEnabled: boolean;
    weeklyBriefDay: number;  // 0=Sunday, 1=Monday, etc.
    weeklyBriefTime: string; // "08:00"
    deepFocusEnabled: boolean;

    setQuietHoursEnabled: (enabled: boolean) => void;
    setQuietHoursStart: (time: string) => void;
    setQuietHoursEnd: (time: string) => void;
    setDailyBriefEnabled: (enabled: boolean) => void;
    setDailyBriefTime: (time: string) => void;
    setWeeklyBriefEnabled: (enabled: boolean) => void;
    setWeeklyBriefDay: (day: number) => void;
    setWeeklyBriefTime: (time: string) => void;
    setDeepFocusEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            quietHoursEnabled: true,
            quietHoursStart: "22:00",
            quietHoursEnd: "07:00",
            dailyBriefEnabled: false,
            dailyBriefTime: "08:00",
            weeklyBriefEnabled: false,
            weeklyBriefDay: 0, // Sunday
            weeklyBriefTime: "08:00",
            deepFocusEnabled: false,

            setQuietHoursEnabled: (enabled) => set({ quietHoursEnabled: enabled }),
            setQuietHoursStart: (time) => set({ quietHoursStart: time }),
            setQuietHoursEnd: (time) => set({ quietHoursEnd: time }),
            setDailyBriefEnabled: (enabled) => set({ dailyBriefEnabled: enabled }),
            setDailyBriefTime: (time) => set({ dailyBriefTime: time }),
            setWeeklyBriefEnabled: (enabled) => set({ weeklyBriefEnabled: enabled }),
            setWeeklyBriefDay: (day) => set({ weeklyBriefDay: day }),
            setWeeklyBriefTime: (time) => set({ weeklyBriefTime: time }),
            setDeepFocusEnabled: (enabled) => set({ deepFocusEnabled: enabled }),
        }),
        {
            name: 'asteron-settings',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
