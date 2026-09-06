import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Calendar } from '../../components/Calendar';
import { Button, Card, Chip, EmptyState, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

const TIME_OPTIONS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const DURATIONS = [1, 2, 4, 8];

function isoDay(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

type DayItem =
  | { kind: 'job'; id: string; startsAt: string; endsAt?: string; title: string; subtitle: string; detail: string }
  | { kind: 'private'; id: string; startsAt: string; endsAt: string; title: string; notes: string };

export default function CalendarScreen() {
  const {
    calendarEntries,
    refreshCalendar,
    addCalendarEntry,
    deleteCalendarEntry,
    requests,
    refreshRequests,
    myListings,
  } = useApp();

  const [selectedDay, setSelectedDay] = useState<string>(() => isoDay(new Date()));
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshCalendar();
      refreshRequests();
    }, [refreshCalendar, refreshRequests])
  );

  const myListingIds = useMemo(() => new Set(myListings.map((l) => l.id)), [myListings]);

  // RockServ work is read off the requests themselves rather than copied into
  // the calendar table, so a job that moves can't leave a ghost behind.
  const scheduledJobs = useMemo(
    () =>
      requests.filter(
        (r) => myListingIds.has(r.companyId) && r.scheduledFor && r.status !== 'declined'
      ),
    [requests, myListingIds]
  );

  const unscheduledJobs = useMemo(
    () =>
      requests.filter(
        (r) =>
          myListingIds.has(r.companyId) &&
          !r.scheduledFor &&
          r.status === 'accepted'
      ),
    [requests, myListingIds]
  );

  const markedDays = useMemo(() => {
    const days = new Set<string>();
    scheduledJobs.forEach((r) => days.add(isoDay(r.scheduledFor!)));
    calendarEntries.forEach((e) => days.add(isoDay(e.startsAt)));
    return days;
  }, [scheduledJobs, calendarEntries]);

  const dayItems: DayItem[] = useMemo(() => {
    const items: DayItem[] = [];
    scheduledJobs
      .filter((r) => isoDay(r.scheduledFor!) === selectedDay)
      .forEach((r) =>
        items.push({
          kind: 'job',
          id: r.id,
          startsAt: r.scheduledFor!,
          title: r.contact?.name ?? r.customerName,
          subtitle: `Case #${r.caseNumber} · ${r.categoryName}`,
          detail: r.contact?.address ?? r.area,
        })
      );
    calendarEntries
      .filter((e) => isoDay(e.startsAt) === selectedDay)
      .forEach((e) =>
        items.push({
          kind: 'private',
          id: e.id,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          title: e.title || 'Busy',
          notes: e.notes,
        })
      );
    return items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [scheduledJobs, calendarEntries, selectedDay]);

  async function handleAdd() {
    const [h, m] = startTime.split(':').map(Number);
    const [y, mo, d] = selectedDay.split('-').map(Number);
    const start = new Date(y, mo - 1, d, h, m, 0, 0);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setBusy(true);
    const { error } = await addCalendarEntry({
      title: title.trim(),
      notes: notes.trim(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
    setBusy(false);
    if (error) {
      notify('Could not save', error);
      return;
    }
    setTitle('');
    setNotes('');
    setAdding(false);
  }

  function handleDelete(id: string) {
    confirmAction('Remove this entry?', 'It only comes off your own calendar.', 'Remove', async () => {
      const { error } = await deleteCalendarEntry(id);
      if (error) notify('Could not remove', error);
    });
  }

  const dayLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          Your whole diary. RockServ jobs land here once you schedule them; anything else you add is yours alone —
          RockServ can see that you're busy, never who for.
        </Text>

        <Card style={{ marginTop: spacing.md }}>
          <Calendar selectedDate={selectedDay} onSelectDate={setSelectedDay} markedDates={markedDays} allowPast />
        </Card>

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{dayLabel}</Text>
          {!adding && (
            <Text style={styles.addLink} onPress={() => setAdding(true)}>
              + Add
            </Text>
          )}
        </View>

        {adding && (
          <Card style={{ marginBottom: spacing.md }}>
            <SectionLabel>Your own job</SectionLabel>
            <Text style={styles.privateHint}>
              Private to you. RockServ only ever sees that the time is taken.
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What is it? e.g. Kitchen fit, private client"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              multiline
            />
            <Text style={styles.pickerLabel}>Starts</Text>
            <View style={styles.chipWrap}>
              {TIME_OPTIONS.map((t) => (
                <Chip key={t} label={t} selected={startTime === t} onPress={() => setStartTime(t)} />
              ))}
            </View>
            <Text style={styles.pickerLabel}>For how long</Text>
            <View style={styles.chipWrap}>
              {DURATIONS.map((h) => (
                <Chip key={h} label={h === 8 ? 'All day' : `${h}h`} selected={hours === h} onPress={() => setHours(h)} />
              ))}
            </View>
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Button title="Add to calendar" onPress={handleAdd} loading={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="outline" onPress={() => setAdding(false)} />
              </View>
            </View>
          </Card>
        )}

        {dayItems.length === 0 && !adding ? (
          <EmptyState icon="calendar-outline" title="Nothing booked" subtitle="This day is free." />
        ) : (
          dayItems.map((item) => (
            <Card key={item.id} style={{ marginBottom: spacing.sm }}>
              <View style={styles.itemRow}>
                <Text style={styles.itemTime}>{timeLabel(item.startsAt)}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={item.kind === 'job' ? styles.tagJob : styles.tagPrivate}>
                      {item.kind === 'job' ? 'RockServ' : 'Your own'}
                    </Text>
                  </View>
                  {item.kind === 'job' ? (
                    <>
                      <Text style={styles.itemMeta}>{item.subtitle}</Text>
                      {item.detail ? <Text style={styles.itemMeta}>{item.detail}</Text> : null}
                    </>
                  ) : (
                    <>
                      <Text style={styles.itemMeta}>
                        until {timeLabel(item.endsAt)}
                      </Text>
                      {item.notes ? <Text style={styles.itemMeta}>{item.notes}</Text> : null}
                    </>
                  )}
                </View>
                {item.kind === 'private' && (
                  <Pressable onPress={() => handleDelete(item.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
                  </Pressable>
                )}
              </View>
            </Card>
          ))
        )}

        {unscheduledJobs.length > 0 && (
          <View style={styles.unscheduled}>
            <SectionLabel>Not in the diary yet</SectionLabel>
            <Text style={styles.privateHint}>
              Accepted jobs with no date set. Give them one from the Requests tab and they appear here.
            </Text>
            {unscheduledJobs.map((r) => (
              <Card key={r.id} style={{ marginTop: spacing.sm }}>
                <Text style={styles.itemTitle}>
                  Case #{r.caseNumber} · {r.contact?.name ?? r.customerName}
                </Text>
                <Text style={styles.itemMeta}>
                  {r.categoryName}
                  {r.preferredDate ? ` · asked for ${r.preferredDate}` : ''}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dayTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },
  addLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
  privateHint: { fontSize: 11.5, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  itemTime: { fontSize: 13, fontWeight: '800', color: colors.primary, width: 46 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text, flex: 1 },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  tagJob: { fontSize: 9.5, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  tagPrivate: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  unscheduled: { marginTop: spacing.xl },
});
