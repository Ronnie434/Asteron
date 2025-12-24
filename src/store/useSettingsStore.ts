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
            setDailyBriefEnabled: (enabled) => set({ dailyBriefEnabled: enabled }),
        }),
        {
            name: 'ai-companion-settings',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
