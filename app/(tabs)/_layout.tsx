import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      // IMPORTANT: Use tabBar={() => null} to completely remove the default tab bar
      // from the component tree. We render our own custom FloatingTabBar in root _layout.tsx.
      // Using just tabBarStyle: { display: 'none' } only hides it visually but the element
      // remains in the view hierarchy and can block touches on elements at the bottom of screens!
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="brief" />
      <Tabs.Screen name="capture" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="upcoming" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}