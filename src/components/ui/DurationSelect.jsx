const HOURS = Array.from({ length: 13 }, (_, i) => String(i));       // 0 - 12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
import Select from "./Select";

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
        <Select value={hours} onChange={(event) => onHoursChange(event.target.value)} aria-label={`${label} hour`}>
          {HOURS.map((h) => (
            <option key={h} value={h}>{h} h</option>
          ))}
        </Select>
        <Select value={minutes} onChange={(event) => onMinutesChange(event.target.value)} aria-label={`${label} minute`}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>{m} m</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
