import { useEffect, useMemo, useRef, useState } from "react";

/**
 * BrandAutocomplete — drop-in, controlled autocomplete for brand text.
 *
 * Props:
 *  - label?: string (default: "Brand")
 *  - value: string
 *  - onChange: (next: string) => void
 *  - list: string[]              // full brands list (featured first)
 *  - featuredCount: number       // how many from the top are "featured"
 *  - includeOther?: boolean      // adds trailing "Other" suggestion in menu (search mode)
 *  - className?: string          // extra classes on the root
 *  - placeholder?: string
 *  - id?: string                 // input id (for label htmlFor)
 *
 * Behavior:
 *  - Free text allowed; suggestions are hints only
 *  - Keyboard: ArrowUp/Down, Enter, Escape
 *  - When input is empty and focused, shows featured (and "Other" if enabled)
 */
export default function BrandAutocomplete({
  label = "Brand",
  value,
  onChange,
  list,
  featuredCount,
  includeOther = false,
  className = "",
  placeholder = "Innova, Discraft, MVP…",
  id = "brand",
  required = false,
  clearable = true,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const blurTimer = useRef(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const featured = useMemo(() => list.slice(0, featuredCount), [list, featuredCount]);
  const suggestions = useMemo(() => computeSuggestions(value, list, featuredCount, includeOther), [value, list, featuredCount, includeOther]);

  // open when focusing the input
  const onFocus = () => setOpen(true);
  const onBlur = () => {
    // Delay closing so clicks can register
    blurTimer.current = setTimeout(() => setOpen(false), 80);
  };

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  function onInput(e) {
    onChange(e.target.value);
    setOpen(true);
    setHighlight(-1);
  }

  function choose(name) {
    // Free text is allowed, but choosing sets the input to the clicked option
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
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlight(n - 1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 5, n - 1));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 5, 0));
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

  // Keep the highlighted suggestion visible as the user arrows up/down
  useEffect(() => {
    if (!open) return;
    const ul = listRef.current;
    if (!ul) return;
    const el = ul.querySelector(`[data-idx="${highlight}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlight, open]);

  const showClear = clearable && (value ?? "").trim().length > 0;

  return (
    <div ref={rootRef} className={`pp-field pp-autocomplete ${open ? "is-open" : ""} ${className || ""}`.trim()}>
      <label htmlFor={id}>{label}</label>
      <div className="pp-input-wrap">
        <input
          id={id}
          className="pp-input"
          required={required}
          type="text"
          value={value}
          onChange={onInput}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-expanded={open ? "true" : "false"}
          aria-controls={`${id}-listbox`}
          placeholder={placeholder}
          autoComplete="off"
        />

        {showClear && (
          <button
            type="button"
            className="pp-input-clear"
            aria-label={`Clear ${label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(true);
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="pp-suggest"
          aria-label="Brand suggestions"
          ref={listRef}
        >
          {suggestions.map((name, i) => (
            <li
              key={`${name}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`pp-suggest-item ${i === highlight ? "is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(name)}
              onMouseEnter={() => setHighlight(i)}
              data-idx={i}
            >
              <span>{name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Local styles so this component looks identical wherever it's used */}
      <style jsx>{`
        .pp-autocomplete { position: relative; }
        .pp-input-wrap { position: relative; }
        .pp-input-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          width: 24px;
          height: 24px;
          line-height: 1;
          font-size: 18px;
          border-radius: 999px;
          cursor: pointer;
          color: #666;
        }
        .pp-input-clear:hover { background: #f3f3f3; }
        .pp-input-clear:focus-visible { outline: 2px solid var(--teal, #279989); }
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

/** Suggestion logic matching your existing behavior. */
function computeSuggestions(input, list, featuredCount, includeOther) {
  const q = (input || "").trim().toLowerCase();
  const featured = list.slice(0, featuredCount);

  if (!q) {
    const base = [...featured];
    return includeOther ? [...base, "Other"] : base;
  }

  const starts = list.filter((b) => b.toLowerCase().startsWith(q));
  const contains = list.filter((b) => !starts.includes(b) && b.toLowerCase().includes(q));

  const topStarts = starts.filter((b) => featured.includes(b));
  const restStarts = starts.filter((b) => !featured.includes(b));
  const topContains = contains.filter((b) => featured.includes(b));
  const restContains = contains.filter((b) => !featured.includes(b));

  const uniq = (arr) => Array.from(new Set(arr));
  const results = uniq([...topStarts, ...restStarts, ...topContains, ...restContains]).slice(0, 12);

  return includeOther ? [...results, "Other"] : results;
}
