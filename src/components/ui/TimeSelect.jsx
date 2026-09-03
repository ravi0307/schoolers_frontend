const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export const EMPTY_TIME = { hour: "", minute: "", meridiem: "AM" };

/** Builds the "7:50 AM" string the API stores, or "" when nothing is selected. */
export function formatTime({ hour, minute, meridiem }) {
  if (!hour || !minute) return "";
  return `${hour}:${minute} ${meridiem}`;
}

export default function TimeSelect({ label, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="field">
      <label>{label}</label>
      <div className="grid3">
        <select value={value.hour} onChange={(e) => set({ hour: e.target.value })}>
          <option value="">Hour</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select value={value.minute} onChange={(e) => set({ minute: e.target.value })}>
          <option value="">Min</option>
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={value.meridiem} onChange={(e) => set({ meridiem: e.target.value })}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
