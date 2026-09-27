import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';

// Publishable, not secret — it identifies the account and can do nothing on
// its own. Missing it only breaks paying; the rest of the app still runs,
// which is what you want on a machine that has not been set up yet.
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

// Stripe wants the bare scheme here — "rockserv", not "rockserv://". Handing it
// a URL gets the payment sheet rejected with "Not a valid URL" before a card is
// even charged. Read from the Expo config rather than typed out, so it cannot
// drift from app.json; `scheme` there may be a string or a list of them.
const appScheme =
  (typeof Constants.expoConfig?.scheme === 'string'
    ? Constants.expoConfig.scheme
    : Constants.expoConfig?.scheme?.[0]) ?? 'rockserv';

export default function App() {
  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={stripePublishableKey}
        // Some card issuers bounce the payer out to their bank to approve a
        // payment. This is the scheme that brings them back into RockServ
        // afterwards instead of stranding them in a browser.
        urlScheme={appScheme}
      >
        <AppProvider>
          {/* Every in-app screen sits on #F1F5F9, so white status-bar text was
              all but invisible. The one dark screen (mode select) overrides
              this locally. */}
          <StatusBar style="dark" />
          <RootNavigator />
        </AppProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
