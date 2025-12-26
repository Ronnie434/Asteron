import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
    quietHoursEnabled: boolean;
    quietHoursStart: string; // "22:00"
    quietHoursEnd: string;   // "07:00"
    dailyBriefEnabled: boolean;
    dailyBriefTime: string;  // "08:00"

    setQuietHoursEnabled: (enabled: boolean) => void;
    setQuietHoursStart: (time: string) => void;
    setQuietHoursEnd: (time: string) => void;
    setDailyBriefEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            quietHoursEnabled: true,
            quietHoursStart: "22:00",
            quietHoursEnd: "07:00",
            dailyBriefEnabled: true,
            dailyBriefTime: "08:00",

            setQuietHoursEnabled: (enabled) => set({ quietHoursEnabled: enabled }),
            setQuietHoursStart: (time) => set({ quietHoursStart: time }),
            setQuietHoursEnd: (time) => set({ quietHoursEnd: time }),
            setDailyBriefEnabled: (enabled) => set({ dailyBriefEnabled: enabled }),
        }),
        {
            name: 'asteron-settings',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
