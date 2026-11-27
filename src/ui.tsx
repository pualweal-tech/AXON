import { useEffect, useRef, type ReactNode } from "react";
import { t } from "./i18n";
import { IconBolt, IconChat, IconFolder, IconPerson } from "./icons";
import { useStore } from "./store";
import type { Tab } from "./types";

export function BottomNav() {
  const { data, ui, setTab } = useStore();
  const lang = data.lang;
  const items: {
    id: Tab;
    label: ReturnType<typeof t>;
    icon: ReactNode;
    color: string;
  }[] = [
    {
      id: "chat",
      label: t(lang, "chat"),
      icon: <IconChat size={20} />,
      color: "#7B61FF",
    },
    {
      id: "actions",
      label: t(lang, "actions"),
      icon: <IconBolt size={18} />,
      color: "#FFD60A",
    },
    {
      id: "workspace",
      label: t(lang, "workspace"),
      icon: <IconFolder size={20} />,
      color: "#8A8A94",
    },
    {
      id: "profile",
      label: t(lang, "profile"),
      icon: <IconPerson size={18} />,
      color: "#4C8DFF",
    },
  ];
  return (
    <nav className="nav">
      {items.map((item) => {
        const active = ui.tab === item.id;
        return (
          <button
            key={item.id}
            className={"nav-item press" + (active ? " active" : "")}
            onClick={() => setTab(item.id)}
            aria-label={item.label}
          >
            <span
              className="nav-icon"
              style={{
                color: active
                  ? item.id === "actions"
                    ? "#FFD60A"
                    : "#fff"
                  : item.color,
              }}
            >
              {item.id === "chat" ? (
                <IconChat size={20} filled={active} />
              ) : (
                item.icon
              )}
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function HeaderBar({
  title,
  extra,
  right,
}: {
  title?: ReactNode;
  extra?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div>
        {title}
        {extra}
      </div>
      {right}
    </header>
  );
}

export function Empty({
  title,
  hint,
  action,
  onAction,
}: {
  title: string;
  hint: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{hint}</p>
      <button className="btn btn-primary" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

export function Sheet({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      el = panel.current!;
    const controls = () => [
      ...el.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea,select,[tabindex="0"]',
      ),
    ];
    (controls()[0] || el).focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const a = controls();
        if (!a.length) return;
        if (e.shiftKey && document.activeElement === a[0]) {
          e.preventDefault();
          a.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
          e.preventDefault();
          a[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof children === "string" ? children : "AXON"}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  );
}

export function Switch({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={"switch" + (on ? " on" : "")}
      onClick={onClick}
      aria-label={label}
      role="switch"
      aria-checked={on}
    />
  );
}

export function DateStrip({ onSelect }: { onSelect?: () => void } = {}) {
  const { data, setDate } = useStore();
  const today = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayIso = iso(today);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const tmr = new Date(today);
  tmr.setDate(tmr.getDate() + 1);
  const chips = [
    { id: iso(y), label: t(data.lang, "yesterday") },
    { id: todayIso, label: t(data.lang, "today") },
    { id: iso(tmr), label: t(data.lang, "tomorrow") },
  ];
  return (
    <div className="date-row">
      {chips.map((c) => (
        <button
          key={c.id}
          className={
            "date-chip press" + (data.selectedDate === c.id ? " active" : "")
          }
          onClick={() => {
            setDate(c.id);
            onSelect?.();
          }}
        >
          {c.label}
        </button>
      ))}
      <label className="date-chip" style={{ display: "inline-flex" }}>
        {t(data.lang, "pickDate")}
        <input
          type="date"
          value={data.selectedDate}
          onChange={(e) => {
            if (e.target.value) {
              setDate(e.target.value);
              onSelect?.();
            }
          }}
          style={{
            position: "absolute",
            opacity: 0,
            width: 1,
            height: 1,
          }}
        />
      </label>
    </div>
  );
}
