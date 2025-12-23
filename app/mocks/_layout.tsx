import { Stack } from 'expo-router';

export default function MocksLayout() {
  return (
    <Stack>
      <Stack.Screen name="daily-brief" options={{ headerShown: false }} />
      <Stack.Screen name="capture-overlay" options={{ headerShown: false, presentation: 'transparentModal' }} />
    </Stack>
  );
}
