import { registerRootComponent } from 'expo';
import React from 'react';
import { CrashBoundary, reportCrash } from './src/components/CrashOverlay';

// Registered before anything else loads — a static `import App from './App'`
// would pull in AppContext (and the Supabase client it creates at module
// load time) before this line ever ran, so a crash during that module
// evaluation would happen before any handler was in place to catch it.
// Loading App dynamically, inside a try/catch, closes that gap: even a
// crash while App's own imports are being evaluated gets reported.
const globalAny = global as any;
if (globalAny.ErrorUtils) {
  globalAny.ErrorUtils.setGlobalHandler((error: Error) => {
    reportCrash(error);
  });
}

function Root() {
  const [AppComponent, setAppComponent] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    import('./App')
      .then((mod) => setAppComponent(() => mod.default))
      .catch((err) => reportCrash(err instanceof Error ? err : new Error(String(err))));
  }, []);

  return React.createElement(CrashBoundary, null, AppComponent ? React.createElement(AppComponent) : null);
}

registerRootComponent(Root);
