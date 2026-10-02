import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import FormField from "./FormField";
import styles from "./PasswordInput.module.css";

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  required = true,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label} hint={hint} required={required}>
      <div className={styles.control}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={styles.input}
        />
        <button
          className={styles.toggle}
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </FormField>
  );
}
