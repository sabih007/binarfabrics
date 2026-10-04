/* ==========================================================================
   The four tabs. SF Symbols on iOS, Material icons on Android.
   The bag carries a badge with the number of items in it.
   ========================================================================== */

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useCart } from '@/store/cart';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { count } = useCart();

  return (
    <NativeTabs
      backgroundColor={colors.paper}
      indicatorColor={colors.cream}
      labelStyle={{ selected: { color: colors.green } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shop">
        <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="bag">
        <NativeTabs.Trigger.Label>Bag</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag" md="shopping_bag" />
        {count > 0 ? <NativeTabs.Trigger.Badge>{String(count)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="track">
        <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox" md="local_shipping" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
