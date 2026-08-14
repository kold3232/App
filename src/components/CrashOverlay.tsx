// Renders the actual error message/stack on screen instead of letting
// React Native's default production behavior silently abort the app
// (RCTFatal) or hang. Standalone/TestFlight builds show neither a red
// error screen nor a console — this is how we make a crash self-diagnosing
// without needing Xcode, a registered device, or App Store Connect.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Listener = (error: Error) => void;
let listeners: Listener[] = [];
let lastError: Error | null = null;

export function reportCrash(error: Error) {
  lastError = error;
  listeners.forEach((l) => l(error));
}

function subscribeCrash(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function CrashScreen({ error }: { error: Error }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>App crashed — screenshot this</Text>
        <Text style={styles.message}>{String(error?.message ?? error)}</Text>
        <Text style={styles.stack}>{error?.stack ?? 'No stack trace available.'}</Text>
      </ScrollView>
    </View>
  );
}

type State = { error: Error | null };

export class CrashBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: lastError };
  unsubscribe?: () => void;

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidMount() {
    this.unsubscribe = subscribeCrash((error) => this.setState({ error }));
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  componentDidCatch(error: Error) {
    reportCrash(error);
  }

  render() {
    if (this.state.error) {
      return <CrashScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 60, paddingHorizontal: 16 },
  scroll: { paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '800', color: '#B91C1C', marginBottom: 12 },
  message: { fontSize: 14, color: '#111827', marginBottom: 16, fontWeight: '600' },
  stack: { fontSize: 11, color: '#4B5563' },
});
