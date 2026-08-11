export type TimeSlot = {
  id: string;
  dayLabel: string;
  time: string;
};

export function generateSlots(days = 4, times = ['09:00', '11:30', '14:00', '16:30']): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  for (let d = 1; d <= days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayLabel = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    for (const time of times) {
      slots.push({ id: `${date.toISOString().slice(0, 10)}-${time}`, dayLabel, time });
    }
  }
  return slots;
}
