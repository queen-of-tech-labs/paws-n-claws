// TimePicker15 — Hour + Minute dropdowns, minutes locked to 15-min intervals.
// Two compact selects side by side: one for hour (12-hour + AM/PM), one for :00/:15/:30/:45.
// Much faster to use than a single long scrolling list.
// Keeps the same API: value="HH:MM" (24hr), onChange(newValue).

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Round any HH:MM string to the nearest 15-minute slot
export function roundToNearest15(timeStr) {
  if (!timeStr) return '09:00';
  const [h, m] = timeStr.split(':').map(Number);
  const rounded = Math.round(m / 15) * 15;
  if (rounded === 60) {
    return `${String((h + 1) % 24).padStart(2, '0')}:00`;
  }
  return `${String(h).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`;
}

// Parse a "HH:MM" 24hr string into { hour24, minute, period }
function parseTime(timeStr) {
  const safe = roundToNearest15(timeStr || '09:00');
  const [h, m] = safe.split(':').map(Number);
  return {
    hour24: h,
    minute: m,
    period: h < 12 ? 'AM' : 'PM',
    hour12: h === 0 ? 12 : h > 12 ? h - 12 : h,
  };
}

// Convert hour12 + period back to hour24
function toHour24(hour12, period) {
  const h = parseInt(hour12);
  if (period === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

// Format to HH:MM 24hr
function toTimeStr(hour24, minute) {
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [
  { value: 0, label: ':00' },
  { value: 15, label: ':15' },
  { value: 30, label: ':30' },
  { value: 45, label: ':45' },
];

export default function TimePicker15({ value, onChange, required, className }) {
  const { hour12, minute, period } = parseTime(value);

  const handleHourChange = (newHour12) => {
    const h24 = toHour24(newHour12, period);
    onChange(toTimeStr(h24, minute));
  };

  const handleMinuteChange = (newMinute) => {
    const h24 = toHour24(hour12, period);
    onChange(toTimeStr(h24, parseInt(newMinute)));
  };

  const handlePeriodChange = (newPeriod) => {
    const h24 = toHour24(hour12, newPeriod);
    onChange(toTimeStr(h24, minute));
  };

  const triggerClass = className || 'bg-slate-800 border-slate-700 text-white';

  return (
    // flex-wrap is a belt-and-suspenders guard: the three selects below need
    // ~232px in a row (w-16 + w-20 + w-20 + gaps). Some dialogs place this
    // inside a 2-column grid cell that's narrower than that on phone screens
    // (see CareLogForm.jsx's reminder section), which pushed this row past
    // the dialog's edge. Letting it wrap to a second line keeps it inside
    // its container instead of forcing the row wider than its parent.
    <div className="flex flex-wrap gap-1">
      {/* Hour */}
      <Select value={String(hour12)} onValueChange={handleHourChange} required={required}>
        <SelectTrigger className={`${triggerClass} w-16`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map(h => (
            <SelectItem key={h} value={String(h)}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Minute */}
      <Select value={String(minute)} onValueChange={handleMinuteChange}>
        <SelectTrigger className={`${triggerClass} w-20`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map(({ value: v, label }) => (
            <SelectItem key={v} value={String(v)}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM */}
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className={`${triggerClass} w-20`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
