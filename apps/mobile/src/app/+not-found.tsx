import { Stack, useRouter } from 'expo-router';

import { EmptyState } from '@/components/states';

export default function NotFoundRoute() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <EmptyState
        title="This page has moved on"
        body="The link you followed does not lead anywhere in the app."
        action={{ label: 'Go to the shop', onPress: () => router.replace('/shop') }}
      />
    </>
  );
}
