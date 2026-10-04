/* ==========================================================================
   Root layout: providers, then the navigator.

   The bag must be read from storage before anything renders a count, and the
   filter set has to outlive the filter sheet being dismissed, so both providers
   sit above the stack.

   One light theme on every platform, matching the website — see `src/theme.ts`.
   ========================================================================== */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartProvider } from '@/store/cart';
import { FiltersProvider } from '@/store/filters';
import { colors, type as typography } from '@/theme';

export default function RootLayout() {
  // Created once per app session, not once per render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <CartProvider>
          <FiltersProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.paper },
                headerTitleStyle: { ...typography.heading, fontSize: 16 },
                headerTintColor: colors.ink,
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: colors.paper },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="product/[slug]" options={{ title: 'Design' }} />
              <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
              <Stack.Screen name="order/[number]" options={{ title: 'Your order' }} />
              <Stack.Screen
                name="filters"
                options={{
                  title: 'Filter & sort',
                  presentation: 'formSheet',
                  sheetGrabberVisible: true,
                  sheetAllowedDetents: [0.65, 1],
                  headerShown: false,
                }}
              />
            </Stack>
          </FiltersProvider>
        </CartProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
