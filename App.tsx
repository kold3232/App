import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { AppProvider } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import { CrashBoundary, reportCrash } from './src/components/CrashOverlay';

// Standalone builds show neither a red error screen nor a console — an
// uncaught JS error otherwise silently aborts the app (RCTFatal) with no
// way to see why. Intercepting it here and rendering it via CrashBoundary
// instead makes that failure mode self-diagnosing on-device.
const globalAny = global as any;
if (globalAny.ErrorUtils) {
  globalAny.ErrorUtils.setGlobalHandler((error: Error) => {
    reportCrash(error);
  });
}

export default function App() {
  return (
    <CrashBoundary>
      <AppProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AppProvider>
    </CrashBoundary>
  );
}
