// TimePicker15 — A time selector that only allows 15-minute intervals.
// This matches the scheduler which runs every 15 minutes.
// Replaces <Input type="time"> wherever reminders are set.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Generate all times in HH:MM format at 15-minute intervals
function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 15, 30, 45]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      // Display in 12-hour format
      const period = h < 12 ? 'AM' : 'PM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayH}:${mm} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Round any existing HH:MM value to the nearest 15-minute slot
export function roundToNearest15(timeStr) {
  if (!timeStr) return '09:00';
  const [h, m] = timeStr.split(':').map(Number);
  const rounded = Math.round(m / 15) * 15;
  if (rounded === 60) {
    return `${String((h + 1) % 24).padStart(2, '0')}:00`;
  }
  return `${String(h).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`;
}

export default function TimePicker15({ value, onChange, required, className }) {
  const safeValue = roundToNearest15(value);

  return (
    <Select value={safeValue} onValueChange={onChange} required={required}>
      <SelectTrigger className={className || 'bg-slate-800 border-slate-700 text-white'}>
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {TIME_OPTIONS.map(({ value: v, label }) => (
          <SelectItem key={v} value={v}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
