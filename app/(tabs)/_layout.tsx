import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Hide the default tab bar - we render our own in root _layout.tsx
        tabBarStyle: { display: 'none', height: 0 },
      }}
    >
      <Tabs.Screen name="brief" />
      <Tabs.Screen name="capture" />
      <Tabs.Screen name="upcoming" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}