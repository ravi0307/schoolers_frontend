import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Select from "./Select";
import styles from "./DatePicker.module.css";

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const MAX_CALENDAR_HEIGHT = 560;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_FORMAT = /^\d{4}-\d{2}$/;

const usePositionEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function pad(value) {
  return String(value).padStart(2, "0");
}

function isoDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function isoMonth(year, month) {
  return `${String(year).padStart(4, "0")}-${pad(month)}`;
}

function todayIso() {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function currentMonth() {
  return todayIso().slice(0, 7);
}

function parseDate(value) {
  if (!DATE_FORMAT.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;
  return date;
}

function parseMonth(value) {
  if (!MONTH_FORMAT.test(String(value || ""))) return null;
  const [year, month] = String(value).split("-").map(Number);
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function formatDate(date) {
  return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatMonth(date) {
  return isoMonth(date.getFullYear(), date.getMonth() + 1);
}

function monthOfDate(value) {
  const date = parseDate(value);
  return date ? formatMonth(date) : currentMonth();
}

function shiftMonth(value, delta) {
  const date = parseMonth(value) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  date.setMonth(date.getMonth() + delta);
  return formatMonth(date);
}

function shiftDateByMonths(value, delta) {
  const current = parseDate(value) || new Date();
  const day = current.getDate();
  current.setDate(1);
  current.setMonth(current.getMonth() + delta);
  const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  current.setDate(Math.min(day, lastDay));
  return formatDate(current);
}

function dateFromMonth(monthValue, day = 1) {
  const date = parseMonth(monthValue) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), day);
}

function compareValues(left, right) {
  if (!left || !right) return 0;
  return left < right ? -1 : left > right ? 1 : 0;
}

function localDateLabel(value) {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(date)
    : value;
}

function localMonthLabel(value, options = { month: "long", year: "numeric" }) {
  const date = parseMonth(value);
  return date ? new Intl.DateTimeFormat(undefined, options).format(date) : value;
}

function buttonClassName(...names) {
  return names.filter(Boolean).join(" ");
}

const DatePicker = forwardRef(function DatePicker(
  {
    type = "date",
    value,
    defaultValue = "",
    min,
    max,
    disabled = false,
    readOnly = false,
    required = false,
    id,
    name,
    className = "",
    onChange,
    onClick,
    onKeyDown,
    onInput,
    onInvalid,
    onBlur,
    onFocus,
    ...inputProps
  },
  forwardedRef
) {
  const isMonth = type === "month";
  const generatedId = `date-picker-${useId().replaceAll(":", "")}`;
  const inputId = id || generatedId;
  const calendarId = `${inputId}-calendar`;
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(() => String(defaultValue || ""));
  const selectedValue = isControlled ? String(value || "") : uncontrolledValue;
  const initialView = isMonth
    ? (parseMonth(selectedValue) ? selectedValue : currentMonth())
    : monthOfDate(selectedValue);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(initialView);
  const [activeCell, setActiveCell] = useState(selectedValue || "");
  const [calendarPosition, setCalendarPosition] = useState(null);

  const setInputNode = useCallback((node) => {
    inputRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const closeCalendar = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    setCalendarPosition(null);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const isValueDisabled = useCallback((nextValue) => {
    if (!nextValue) return false;
    const lowerBound = String(min || "");
    const upperBound = String(max || "");
    return (lowerBound && compareValues(nextValue, lowerBound) < 0)
      || (upperBound && compareValues(nextValue, upperBound) > 0);
  }, [max, min]);

  const emitChange = useCallback((nextValue) => {
    if (isValueDisabled(nextValue)) return;
    if (!isControlled) setUncontrolledValue(nextValue);
    if (typeof onChange === "function") {
      const target = { value: nextValue, name, id: inputId };
      onChange({ target, currentTarget: inputRef.current, type: "change" });
    }
  }, [inputId, isControlled, isValueDisabled, name, onChange]);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const nextView = isMonth
      ? (parseMonth(selectedValue) ? selectedValue : currentMonth())
      : monthOfDate(selectedValue);
    setViewMonth(nextView);
    setActiveCell(selectedValue || (isMonth ? nextView : `${nextView}-01`));
    setCalendarPosition(null);
    setIsOpen(true);
  }, [disabled, isMonth, selectedValue]);

  const dateCells = useMemo(() => {
    if (isMonth) return [];
    const viewDate = dateFromMonth(viewMonth);
    const leadingDays = (viewDate.getDay() + 6) % 7;
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - leadingDays);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return formatDate(date);
    });
  }, [isMonth, viewMonth]);

  const monthCells = useMemo(() => (
    isMonth
      ? Array.from({ length: 12 }, (_, index) => isoMonth(Number(viewMonth.slice(0, 4)), index + 1))
      : []
  ), [isMonth, viewMonth]);

  const visibleCells = isMonth ? monthCells : dateCells;
  const selectedMonth = isMonth ? selectedValue : selectedValue.slice(0, 7);

  const changeView = useCallback((delta) => {
    const nextActive = isMonth
      ? shiftMonth(activeCell || viewMonth, delta)
      : shiftDateByMonths(activeCell || `${viewMonth}-01`, delta);
    const nextView = isMonth ? nextActive : nextActive.slice(0, 7);
    setViewMonth(nextView);
    setActiveCell(nextActive);
  }, [activeCell, isMonth, viewMonth]);

  const handleCellSelect = useCallback((nextValue) => {
    if (isValueDisabled(nextValue)) return;
    emitChange(nextValue);
    if (!isMonth) setViewMonth(nextValue.slice(0, 7));
    closeCalendar(true);
  }, [closeCalendar, emitChange, isMonth, isValueDisabled]);

  const handleClear = useCallback(() => {
    if (required) {
      if (!isControlled) setUncontrolledValue("");
      if (typeof onChange === "function") {
        const target = { value: "", name, id: inputId };
        onChange({ target, currentTarget: inputRef.current, type: "change" });
      }
    } else {
      emitChange("");
    }
    closeCalendar(true);
  }, [closeCalendar, emitChange, inputId, isControlled, name, onChange, required]);

  const handleToday = useCallback(() => {
    const nextValue = isMonth ? currentMonth() : todayIso();
    if (!isValueDisabled(nextValue)) handleCellSelect(nextValue);
  }, [handleCellSelect, isMonth, isValueDisabled]);

  usePositionEffect(() => {
    if (!isOpen || !calendarRef.current) return undefined;
    const focusable = calendarRef.current.querySelector(
      isMonth ? `button[data-month="${activeCell}"]` : `button[data-date="${activeCell}"]`
    ) || calendarRef.current.querySelector(isMonth ? "button[data-month]" : "button[data-date]");
    if (focusable) window.requestAnimationFrame(() => focusable.focus());
    return undefined;
  }, [activeCell, isMonth, isOpen, viewMonth]);

  const positionCalendar = useCallback(() => {
    if (!calendarRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const calendar = calendarRef.current;
    const naturalHeight = Math.min(calendar.scrollHeight || calendar.getBoundingClientRect().height, MAX_CALENDAR_HEIGHT);
    const availableBelow = Math.max(0, window.innerHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_PADDING);
    const availableAbove = Math.max(0, triggerRect.top - MENU_GAP - VIEWPORT_PADDING);
    const placement = availableBelow >= naturalHeight || availableBelow >= availableAbove ? "below" : "above";
    const availableHeight = placement === "below" ? availableBelow : availableAbove;
    const maxHeight = Math.max(1, Math.min(naturalHeight, availableHeight || window.innerHeight - VIEWPORT_PADDING * 2));
    const width = Math.min(calendar.getBoundingClientRect().width || 352, window.innerWidth - VIEWPORT_PADDING * 2);
    const left = Math.min(
      Math.max(triggerRect.left, VIEWPORT_PADDING),
      Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING)
    );
    const height = Math.min(naturalHeight, maxHeight);
    const initialTop = placement === "above"
      ? triggerRect.top - MENU_GAP - height
      : triggerRect.bottom + MENU_GAP;
    const top = Math.min(
      Math.max(initialTop, VIEWPORT_PADDING),
      Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING)
    );
    setCalendarPosition({ top, left, width, maxHeight, placement });
  }, []);

  usePositionEffect(() => {
    if (!isOpen) return undefined;
    positionCalendar();
    const reposition = () => positionCalendar();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen, positionCalendar, visibleCells.length]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;
    const handleOutside = (event) => {
      const target = event.target;
      if (inputRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      if (calendarRef.current?.contains(target)) return;
      if (target.closest?.("[data-select-root]")) return;
      closeCalendar(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("click", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("click", handleOutside);
    };
  }, [closeCalendar, isOpen]);

  useEffect(() => {
    if (isOpen && disabled) closeCalendar(false);
  }, [closeCalendar, disabled, isOpen]);

  const setActiveCellAndFocus = useCallback((nextValue) => {
    setActiveCell(nextValue);
    const selector = isMonth
      ? `button[data-month="${nextValue}"]`
      : `button[data-date="${nextValue}"]`;
    const cell = calendarRef.current?.querySelector(selector);
    if (cell) cell.focus();
    else window.requestAnimationFrame(() => calendarRef.current?.querySelector(selector)?.focus());
  }, [isMonth]);

  const moveActiveCell = useCallback((delta) => {
    const currentIndex = visibleCells.indexOf(activeCell);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    let nextIndex = startIndex + delta;
    while (nextIndex >= 0 && nextIndex < visibleCells.length && isValueDisabled(visibleCells[nextIndex])) {
      nextIndex += delta > 0 ? 1 : -1;
    }
    if (nextIndex < 0 || nextIndex >= visibleCells.length) return;
    setActiveCellAndFocus(visibleCells[nextIndex]);
  }, [activeCell, isValueDisabled, setActiveCellAndFocus, visibleCells]);

  const handleCalendarKeyDown = useCallback((event) => {
    if (event.defaultPrevented) return;
    const key = event.key;
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeCalendar(true);
      return;
    }
    if (key === "Enter" || key === " ") {
      if (event.target.matches("button[data-date], button[data-month]")) {
        event.preventDefault();
        handleCellSelect(event.target.dataset.date || event.target.dataset.month || activeCell);
      }
      return;
    }
    if (key === "ArrowRight") {
      event.preventDefault();
      moveActiveCell(1);
      return;
    }
    if (key === "ArrowLeft") {
      event.preventDefault();
      moveActiveCell(-1);
      return;
    }
    if (key === "ArrowDown") {
      event.preventDefault();
      moveActiveCell(isMonth ? 3 : 7);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      moveActiveCell(isMonth ? -3 : -7);
      return;
    }
    if (key === "Home" || key === "End") {
      event.preventDefault();
      const nextIndex = key === "Home" ? 0 : visibleCells.length - 1;
      const nextValue = visibleCells[nextIndex];
      if (nextValue && !isValueDisabled(nextValue)) setActiveCellAndFocus(nextValue);
      return;
    }
    if (key === "PageUp" || key === "PageDown") {
      event.preventDefault();
      const direction = key === "PageUp" ? -1 : 1;
      const delta = isMonth || event.shiftKey ? direction * 12 : direction;
      const nextActive = isMonth
        ? shiftMonth(activeCell, delta)
        : shiftDateByMonths(activeCell, delta);
      const nextView = isMonth ? shiftMonth(viewMonth, delta) : nextActive.slice(0, 7);
      setViewMonth(nextView);
      setActiveCellAndFocus(nextActive);
    }
  }, [activeCell, closeCalendar, handleCellSelect, isMonth, isValueDisabled, moveActiveCell, setActiveCellAndFocus, viewMonth, visibleCells]);

  const handleYearChange = useCallback((event) => {
    const rawYear = event.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    if (!rawYear) return;
    const nextYear = Number(rawYear);
    const nextView = isoMonth(nextYear, Number(viewMonth.slice(5, 7)));
    setViewMonth(nextView);
    setActiveCell(isMonth ? nextView : `${nextView}-${pad(parseDate(activeCell)?.getDate() || 1)}`);
  }, [activeCell, isMonth, viewMonth]);

  const handleInputChange = useCallback((event) => {
    if (!isControlled) setUncontrolledValue(event.target.value);
    if (typeof onChange === "function") onChange(event);
  }, [isControlled, onChange]);

  const handleInputClick = useCallback((event) => {
    if (typeof onClick === "function") onClick(event);
    if (event.defaultPrevented || disabled || readOnly) return;
    event.preventDefault();
    openCalendar();
  }, [disabled, onClick, openCalendar, readOnly]);

  const handleTriggerClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isOpen) closeCalendar(false);
    else openCalendar();
  }, [closeCalendar, isOpen, openCalendar]);

  const monthOptions = useMemo(() => (
    Array.from({ length: 12 }, (_, index) => (
      <option key={index + 1} value={String(index + 1)}>
        {new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2020, index, 1))}
      </option>
    ))
  ), []);

  const activeDate = parseDate(activeCell);
  const headerLabel = isMonth ? String(viewMonth.slice(0, 4)) : localMonthLabel(viewMonth);
  const monthValue = String(Number(viewMonth.slice(5, 7)));
  const inputClassName = buttonClassName(styles.input, className);
  const rootClassName = styles.root;

  const calendar = isOpen && typeof document !== "undefined"
    ? createPortal(
      <div
        ref={calendarRef}
        id={calendarId}
        className={styles.calendar}
        data-date-calendar="true"
        data-placement={calendarPosition?.placement || "below"}
        role="dialog"
        aria-label={isMonth ? "Choose month" : "Choose date"}
        style={{
          top: calendarPosition?.top ?? 0,
          left: calendarPosition?.left ?? 0,
          width: calendarPosition?.width,
          maxHeight: calendarPosition?.maxHeight,
          visibility: calendarPosition ? "visible" : "hidden",
        }}
        onKeyDown={handleCalendarKeyDown}
      >
        <div className={styles.header}>
          <button
            className={styles.navigationButton}
            type="button"
            aria-label={isMonth ? "Previous year" : "Previous month"}
            onClick={() => changeView(isMonth ? -12 : -1)}
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </button>
          <div className={styles.headerControls}>
            {!isMonth && (
              <Select
                className={styles.monthSelect}
                value={monthValue}
                aria-label="Calendar month"
                onChange={(event) => {
                  const nextView = isoMonth(Number(viewMonth.slice(0, 4)), Number(event.target.value));
                  setViewMonth(nextView);
                  setActiveCell(`${nextView}-${pad(activeDate?.getDate() || 1)}`);
                }}
              >
                {monthOptions}
              </Select>
            )}
            {isMonth && <span className={styles.headerTitle}>{headerLabel}</span>}
            <input
              className={styles.yearInput}
              type="number"
              inputMode="numeric"
              min="1"
              max="9999"
              aria-label="Calendar year"
              value={Number(viewMonth.slice(0, 4))}
              onChange={handleYearChange}
            />
          </div>
          <button
            className={styles.navigationButton}
            type="button"
            aria-label={isMonth ? "Next year" : "Next month"}
            onClick={() => changeView(isMonth ? 12 : 1)}
          >
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>

        {!isMonth && (
          <>
            <div className={styles.weekdayRow} role="row">
              {Array.from({ length: 7 }, (_, index) => (
                <span className={styles.weekday} role="columnheader" key={index}>
                  {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2020, 5, 1 + index))}
                </span>
              ))}
            </div>
            <div className={styles.dayGrid} role="grid" aria-label={headerLabel}>
              {dateCells.map((dateValue) => {
                const date = parseDate(dateValue);
                const isSelected = dateValue === selectedValue;
                const isToday = dateValue === todayIso();
                const isOutside = dateValue.slice(0, 7) !== viewMonth;
                const dateDisabled = isValueDisabled(dateValue);
                return (
                  <div key={dateValue} role="gridcell" aria-selected={isSelected}>
                    <button
                      className={styles.dayCell}
                      type="button"
                      data-date={dateValue}
                      data-selected={isSelected ? "true" : undefined}
                      data-today={isToday ? "true" : undefined}
                      data-outside-month={isOutside ? "true" : undefined}
                      aria-label={localDateLabel(dateValue)}
                      disabled={dateDisabled}
                      onClick={() => handleCellSelect(dateValue)}
                      onMouseEnter={() => setActiveCell(dateValue)}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isMonth && (
          <div className={styles.monthGrid} role="grid" aria-label={headerLabel}>
            {monthCells.map((monthValueItem) => {
              const isSelected = monthValueItem === selectedMonth;
              const isToday = monthValueItem === currentMonth();
              const monthDisabled = isValueDisabled(monthValueItem);
              return (
                <div key={monthValueItem} role="gridcell" aria-selected={isSelected}>
                  <button
                    className={styles.monthCell}
                    type="button"
                    data-month={monthValueItem}
                    data-selected={isSelected ? "true" : undefined}
                    data-today={isToday ? "true" : undefined}
                    aria-label={localMonthLabel(monthValueItem)}
                    disabled={monthDisabled}
                    onClick={() => handleCellSelect(monthValueItem)}
                    onMouseEnter={() => setActiveCell(monthValueItem)}
                  >
                    {localMonthLabel(monthValueItem, { month: "short" })}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.footerButton} type="button" onClick={handleClear}>
            Clear
          </button>
          <button
            className={styles.footerButton}
            type="button"
            onClick={handleToday}
            disabled={isValueDisabled(isMonth ? currentMonth() : todayIso())}
          >
            Today
          </button>
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <span className={rootClassName} data-date-picker-root="true">
      <input
        {...inputProps}
        ref={setInputNode}
        id={inputId}
        className={inputClassName}
        type={isMonth ? "month" : "date"}
        value={selectedValue}
        min={min}
        max={max}
        name={name}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        data-date-input="true"
        aria-controls={isOpen ? calendarId : undefined}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onKeyDown={onKeyDown}
        onInput={onInput}
        onInvalid={onInvalid}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        aria-label="Open calendar"
        aria-expanded={isOpen}
        aria-controls={isOpen ? calendarId : undefined}
        disabled={disabled}
        onClick={handleTriggerClick}
      >
        <CalendarDays aria-hidden="true" size={16} strokeWidth={1.9} />
      </button>
      {calendar}
    </span>
  );
});

export default DatePicker;
