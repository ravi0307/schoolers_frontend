import {
  Children,
  Fragment,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./Select.module.css";

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const MAX_MENU_HEIGHT = 480;
const TYPE_AHEAD_RESET_MS = 500;

const usePositionEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function normalizeValue(value) {
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : "";
  return value == null ? "" : String(value);
}

function textContent(children) {
  let text = "";

  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      text += child;
    } else if (isValidElement(child)) {
      text += textContent(child.props.children);
    }
  });

  return text;
}

function collectOptionElements(children, result = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === Fragment) {
      collectOptionElements(child.props.children, result);
    } else if (child.type === "option") {
      result.push(child);
    }
  });

  return result;
}

function nextEnabledIndex(options, currentIndex, direction) {
  if (options.length === 0) return -1;

  let index = currentIndex;
  if (index < 0) index = direction > 0 ? -1 : options.length;

  for (let count = 0; count < options.length; count += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index].disabled) return index;
  }

  return -1;
}

function initialValue(options, defaultValue) {
  if (defaultValue !== undefined) return normalizeValue(defaultValue);

  return options.find((option) => option.selected)?.value ?? options[0]?.value ?? "";
}

const Select = forwardRef(function Select(
  {
    value,
    defaultValue,
    onChange,
    disabled = false,
    required = false,
    id,
    className = "",
    name,
    children,
    title,
    form,
    autoComplete,
    onBlur,
    onFocus,
    onKeyDown: userOnKeyDown,
    onClick: userOnClick,
    onMouseDown: userOnMouseDown,
    onInvalid,
    onInput,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    ...buttonProps
  },
  forwardedRef
) {
  const generatedId = `select-${useId().replaceAll(":", "")}`;
  const triggerId = id || generatedId;
  const listboxId = `${triggerId}-listbox`;
  const nativeSelectId = `${triggerId}-native`;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typeAheadRef = useRef({ buffer: "", timeoutId: null });

  const optionElements = useMemo(() => collectOptionElements(children), [children]);
  const options = useMemo(
    () => optionElements.map((option, index) => {
      const optionLabel = option.props.label != null
        ? String(option.props.label)
        : textContent(option.props.children);
      const optionValue = option.props.value != null
        ? String(option.props.value)
        : textContent(option.props.children);

      return {
        key: option.key ?? `option-${index}`,
        value: optionValue,
        label: optionLabel,
        disabled: Boolean(option.props.disabled),
        selected: Boolean(option.props.selected),
        className: option.props.className,
      };
    }),
    [optionElements]
  );
  const nativeOptions = useMemo(
    () => optionElements.map((option, index) => cloneElement(option, {
      key: option.key ?? `native-option-${index}`,
    })),
    [optionElements]
  );

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(() => initialValue(options, defaultValue));
  const selectedValue = isControlled ? normalizeValue(value) : uncontrolledValue;
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);

  const setTriggerNode = useCallback((node) => {
    triggerRef.current = node;

    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [forwardedRef]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    setMenuPosition(null);
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;

    const initialActiveIndex = selectedIndex >= 0 && !options[selectedIndex].disabled
      ? selectedIndex
      : options.findIndex((option) => !option.disabled);

    setActiveIndex(initialActiveIndex);
    setMenuPosition(null);
    setIsOpen(true);
  }, [disabled, options, selectedIndex]);

  const selectOption = useCallback((option) => {
    if (!option || option.disabled) return;

    if (!isControlled) setUncontrolledValue(option.value);
    closeMenu();

    if (typeof onChange === "function") {
      const target = { value: option.value, name, id: triggerId };
      onChange({ target, currentTarget: target, type: "change" });
    }
  }, [closeMenu, isControlled, name, onChange, triggerId]);

  const handleNativeChange = useCallback((event) => {
    const nextValue = event.target.value;
    if (!isControlled) setUncontrolledValue(nextValue);
    if (typeof onChange === "function") onChange(event);
  }, [isControlled, onChange]);

  const positionMenu = useCallback(() => {
    if (typeof window === "undefined" || !triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = Math.min(
      Math.max(triggerRect.width, 0),
      Math.max(0, viewportWidth - VIEWPORT_PADDING * 2)
    );
    const naturalHeight = Math.min(
      menu.scrollHeight || menu.getBoundingClientRect().height || 1,
      MAX_MENU_HEIGHT
    );
    const availableBelow = Math.max(
      0,
      viewportHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_PADDING
    );
    const availableAbove = Math.max(
      0,
      triggerRect.top - MENU_GAP - VIEWPORT_PADDING
    );
    const placement = availableBelow >= naturalHeight || availableBelow >= availableAbove
      ? "below"
      : "above";
    const availableHeight = placement === "below" ? availableBelow : availableAbove;
    const fallbackHeight = Math.max(1, viewportHeight - VIEWPORT_PADDING * 2);
    const maxHeight = Math.max(1, Math.min(naturalHeight, availableHeight || fallbackHeight));
    const renderedHeight = Math.min(naturalHeight, maxHeight);
    const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - menuWidth - VIEWPORT_PADDING);
    const left = Math.min(Math.max(triggerRect.left, VIEWPORT_PADDING), maxLeft);
    const initialTop = placement === "above"
      ? triggerRect.top - MENU_GAP - renderedHeight
      : triggerRect.bottom + MENU_GAP;
    const maxTop = Math.max(VIEWPORT_PADDING, viewportHeight - renderedHeight - VIEWPORT_PADDING);
    const top = Math.min(Math.max(initialTop, VIEWPORT_PADDING), maxTop);

    setMenuPosition({
      top,
      left,
      width: menuWidth,
      maxHeight,
      placement,
    });
  }, []);

  usePositionEffect(() => {
    if (!isOpen) return undefined;

    positionMenu();
    const reposition = () => positionMenu();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen, positionMenu]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;

    const handleOutsideEvent = (event) => {
      const target = event.target;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedTrigger && !clickedMenu) closeMenu();
    };

    document.addEventListener("mousedown", handleOutsideEvent);
    document.addEventListener("click", handleOutsideEvent);

    return () => {
      document.removeEventListener("mousedown", handleOutsideEvent);
      document.removeEventListener("click", handleOutsideEvent);
    };
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (disabled && isOpen) closeMenu();
  }, [closeMenu, disabled, isOpen]);

  useEffect(() => () => {
    if (typeAheadRef.current.timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(typeAheadRef.current.timeoutId);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !menuRef.current) return;

    menuRef.current.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const handleTypeAhead = useCallback((key) => {
    const nextKey = key.toLocaleLowerCase();
    const currentBuffer = typeAheadRef.current.buffer;
    const nextBuffer = `${currentBuffer}${nextKey}`;
    let matchIndex = options.findIndex(
      (option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(nextBuffer)
    );

    if (matchIndex < 0) {
      matchIndex = options.findIndex(
        (option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(nextKey)
      );
    }

    typeAheadRef.current.buffer = matchIndex >= 0 ? nextBuffer : nextKey;
    if (typeAheadRef.current.timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(typeAheadRef.current.timeoutId);
    }
    if (typeof window !== "undefined") {
      typeAheadRef.current.timeoutId = window.setTimeout(() => {
        typeAheadRef.current.buffer = "";
        typeAheadRef.current.timeoutId = null;
      }, TYPE_AHEAD_RESET_MS);
    }

    if (matchIndex >= 0) {
      if (!isOpen) setIsOpen(true);
      setActiveIndex(matchIndex);
    }
  }, [isOpen, options]);

  const handleKeyDown = useCallback((event) => {
    if (typeof userOnKeyDown === "function") userOnKeyDown(event);
    if (event.defaultPrevented) return;

    if (event.key === "Tab") {
      if (isOpen) closeMenu();
      return;
    }

    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
      } else {
        selectOption(options[activeIndex]);
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
      } else {
        setActiveIndex((currentIndex) => nextEnabledIndex(
          options,
          currentIndex,
          event.key === "ArrowDown" ? 1 : -1
        ));
      }
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const indexes = options
        .map((option, index) => (!option.disabled ? index : -1))
        .filter((index) => index >= 0);
      setActiveIndex(event.key === "Home" ? indexes[0] ?? -1 : indexes.at(-1) ?? -1);
      if (!isOpen) setIsOpen(true);
      return;
    }

    if (
      event.key.length === 1
      && event.key.trim() !== ""
      && !event.altKey
      && !event.ctrlKey
      && !event.metaKey
    ) {
      event.preventDefault();
      handleTypeAhead(event.key);
    }
  }, [activeIndex, closeMenu, handleTypeAhead, isOpen, openMenu, options, selectOption, userOnKeyDown]);

  const handleTriggerClick = useCallback((event) => {
    if (typeof userOnClick === "function") userOnClick(event);
    if (event.defaultPrevented) return;

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [closeMenu, isOpen, openMenu, userOnClick]);

  const handleTriggerBlur = useCallback((event) => {
    if (typeof onBlur === "function") onBlur(event);

    if (isOpen && event.relatedTarget && !menuRef.current?.contains(event.relatedTarget)) {
      closeMenu();
    }
  }, [closeMenu, isOpen, onBlur]);

  const activeOption = options[activeIndex];
  const triggerClassName = [
    styles.trigger,
    isOpen ? styles.triggerOpen : "",
    className,
  ].filter(Boolean).join(" ");

  const menu = isOpen && typeof document !== "undefined"
    ? createPortal(
      <div
        ref={menuRef}
        id={listboxId}
        className={styles.menu}
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        data-placement={menuPosition?.placement || "below"}
        style={{
          top: menuPosition?.top ?? 0,
          left: menuPosition?.left ?? 0,
          width: menuPosition?.width ?? 0,
          maxHeight: menuPosition?.maxHeight,
          visibility: menuPosition ? "visible" : "hidden",
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selectedValue;
          const isActive = index === activeIndex;
          const optionClassName = [
            styles.option,
            option.className,
            isSelected ? styles.optionSelected : "",
            isActive ? styles.optionActive : "",
            option.disabled ? styles.optionDisabled : "",
          ].filter(Boolean).join(" ");

          return (
            <div
              key={option.key}
              id={`${listboxId}-option-${index}`}
              className={optionClassName}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => {
                if (!option.disabled) setActiveIndex(index);
              }}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </div>
          );
        })}
      </div>,
      document.body
    )
    : null;

  return (
    <div className={styles.wrapper} data-select-root="true">
      <button
        {...buttonProps}
        ref={setTriggerNode}
        id={triggerId}
        type="button"
        className={triggerClassName}
        data-select-trigger="true"
        disabled={disabled}
        title={title}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen && activeOption && !activeOption.disabled
          ? `${listboxId}-option-${activeIndex}`
          : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        aria-required={required || undefined}
        onClick={handleTriggerClick}
        onMouseDown={userOnMouseDown}
        onFocus={onFocus}
        onBlur={handleTriggerBlur}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.value}>{selectedOption?.label || ""}</span>
        <span className={styles.arrow} aria-hidden="true">⌄</span>
      </button>
      <select
        id={nativeSelectId}
        className={styles.nativeSelect}
        name={name}
        form={form}
        autoComplete={autoComplete}
        value={selectedValue}
        disabled={disabled}
         required={required}
         tabIndex={-1}
         role="presentation"
         aria-hidden="true"
        onChange={handleNativeChange}
        onInvalid={onInvalid}
        onInput={onInput}
      >
        {nativeOptions}
      </select>
      {menu}
    </div>
  );
});

export default Select;
