import { useEffect, useMemo, useRef, useState } from "react";

/**
 * MoldAutocomplete — controlled autocomplete for mold text.
 *
 * Props:
 *  - label?: string (default: "Mold")
 *  - value: string
 *  - onChange: (next: string) => void
 *  - list: string[]              // molds for the current brand
 *  - includeOther?: boolean      // default false
 *  - className?: string
 *  - placeholder?: string
 *  - id?: string
 */
export default function MoldAutocomplete({
  label = "Mold",
  value,
  onChange,
  list,
  includeOther = false,
  className = "",
  placeholder = "Destroyer, Buzzz, Hex…",
  id = "mold",
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef(null);
  const listRef = useRef(null);

  const suggestions = useMemo(
    () => computeMoldSuggestions(value, list, includeOther),
    [value, list, includeOther]
  );

  const onFocus = () => setOpen(true);
  const onBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 80);
  };
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  function onInput(e) {
    onChange(e.target.value);
    setOpen(true);
    setHighlight(-1);
  }
  function choose(name) {
    onChange(name);
    setOpen(false);
    setHighlight(-1);
  }

  function onKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    const n = suggestions.length;
    if (n === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (highlight >= 0 && highlight < n) {
        e.preventDefault();
        choose(suggestions[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  }

  useEffect(() => {
    if (!open) return;
    const ul = listRef.current;
    if (!ul) return;
    const el = ul.querySelector(`[data-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  return (
    <div className={`pp-field pp-autocomplete ${open ? "is-open" : ""} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="pp-input"
        type="text"
        required={required}
        value={value}
        onChange={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open ? "true" : "false"}
        aria-controls={`${id}-listbox`}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="pp-suggest"
          ref={listRef}
        >
          {suggestions.map((m, i) => (
            <li
              key={`${m}-${i}`}
              data-idx={i}
              role="option"
              aria-selected={i === highlight}
              className={`pp-suggest-item ${i === highlight ? "is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(m)}
              onMouseEnter={() => setHighlight(i)}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    {/* Local styles so this component looks identical wherever it's used */}
      <style jsx>{`
        .pp-autocomplete { position: relative; }
        .pp-suggest {
          position: absolute;
          z-index: 40;
          top: 100%; /* flush to input bottom */
          left: 0;
          transform: translatey(-10px);
          background: #FFF;
          border: 1px solid var(--cloud);
          border-top: none; /* seamless with input border */
          border-radius: 0 0 10px 10px; /* no top radius to meet input */
          box-shadow: var(--shadow-md, 0 10px 24px rgba(0,0,0,0.08));
          padding: 0; /* no inner gutter; items handle their own padding */
          max-height: 280px;
          overflow: auto;
          width: 50%; /* match input width */
        }
        .pp-suggest-item {
          display: block;
          padding: 10px 12px;
          border-radius: 0; /* full-bleed rows */
          cursor: pointer;
          user-select: none;
          font-size: 14px;
        }
        .pp-suggest-item:hover,
        .pp-suggest-item.is-active {
          background: #f7fbfa;
        }
        
      `}</style>
    </div>

  );
}

function computeMoldSuggestions(input, list, includeOther) {
  const q = (input || "").trim().toLowerCase();
  if (!q) return includeOther ? [...list, "Other"] : [...list];

  const starts = list.filter((m) => m.toLowerCase().startsWith(q));
  const contains = list.filter(
    (m) => !starts.includes(m) && m.toLowerCase().includes(q)
  );

  const results = [...starts, ...contains].slice(0, 12);
  return includeOther ? [...results, "Other"] : results;
}
