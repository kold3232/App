import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Built from the local date parts, not toISOString(). Gibraltar runs UTC+1 or
// +2, so a local midnight converted to UTC lands on the previous day — tapping
// 6 September used to hand back "2025-09-05".
function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function Calendar({
  selectedDate,
  onSelectDate,
  // A business looking at its own diary needs to see last week; a customer
  // picking a preferred date does not. Off by default, so booking is unchanged.
  allowPast = false,
  markedDates,
}: {
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
  allowPast?: boolean;
  markedDates?: Set<string>;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const monthLabel = viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const canGoBack = allowPast || startOfMonth(viewMonth) > startOfMonth(today);

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const leadingBlanks = (first.getDay() + 6) % 7; // Monday-first offset
    const items: (Date | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) items.push(null);
    for (let d = 1; d <= daysInMonth; d++) items.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return items;
  }, [viewMonth]);

  function goPrevMonth() {
    if (!canGoBack) return;
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={goPrevMonth} disabled={!canGoBack} hitSlop={8} style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}>
          <Ionicons name="chevron-back" size={18} color={canGoBack ? colors.primary : colors.textFaint} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={goNextMonth} hitSlop={8} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={styles.weekdayLabel}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`blank-${i}`} style={styles.cell} />;
          const iso = toIsoDate(date);
          const isPast = !allowPast && date < today;
          const isSelected = selectedDate === iso;
          const isToday = date.getTime() === today.getTime();
          const isMarked = !!markedDates?.has(iso);
          return (
            <View key={iso} style={styles.cell}>
              <Pressable
                onPress={() => !isPast && onSelectDate(iso)}
                disabled={isPast}
                style={[styles.dayCircle, isSelected && styles.dayCircleSelected, isToday && !isSelected && styles.dayCircleToday]}
              >
                <Text style={[styles.dayText, isPast && styles.dayTextPast, isSelected && styles.dayTextSelected]}>
                  {date.getDate()}
                </Text>
              </Pressable>
              {isMarked && <View style={[styles.marker, isSelected && styles.markerSelected]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: { opacity: 0.4 },
  monthLabel: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  marker: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  markerSelected: { backgroundColor: colors.textInverse },
  dayCircle: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { fontSize: 13.5, color: colors.text, fontWeight: '600' },
  dayTextPast: { color: colors.textFaint },
  dayTextSelected: { color: colors.textInverse, fontWeight: '800' },
});
