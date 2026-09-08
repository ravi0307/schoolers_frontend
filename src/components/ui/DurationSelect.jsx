const HOURS = Array.from({ length: 13 }, (_, i) => String(i));       // 0 - 12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * Duration picker — two side-by-side dropdowns (hours + minutes) for the
 * amount of time to add to a start time. Renders as a single .field so the
 * surrounding grid4 layout still aligns with the other inputs.
 */
export default function DurationSelect({ label, hours, minutes, onHoursChange, onMinutesChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="grid2">
        <select value={hours} onChange={(event) => onHoursChange(event.target.value)}>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h} h</option>
          ))}
        </select>
        <select value={minutes} onChange={(event) => onMinutesChange(event.target.value)}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m} m</option>
          ))}
        </select>
      </div>
    </div>
  );
}
