import { useState } from "react";
import { t } from "../i18n";
import { IconBack, IconCal, IconTrash } from "../icons";
import { contextScore, useStore } from "../store";
import type { MemoryCategory, MemoryItem } from "../types";
import { Empty, Switch } from "../ui";

function Group({ title, items }: { title: string; items: MemoryItem[] }) {
  const { data, toggleMemory, deleteMemory, updateMemory } = useStore();
  const lang = data.lang;
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <section className="card" style={{ marginBottom: 12 }}>
      <div className="row space-between" style={{ marginBottom: 12 }}>
        <b>{title}</b>
        <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          {items.length} {t(lang, "items")}
        </span>
      </div>
      {items.map((m) => (
        <div
          key={m.id}
          className="card"
          style={{
            marginBottom: 8,
            background: "var(--surface-secondary)",
            border: 0,
            opacity: m.enabled ? 1 : 0.55,
          }}
        >
          <div className="row space-between">
            <span className="section-label">{m.kind}</span>
            <span className="pill success">{m.enabled ? "✓" : "—"}</span>
          </div>
          {editId === m.id ? (
            <textarea
              className="field field-area"
              style={{ marginTop: 8, minHeight: 80 }}
              value={m.text}
              onChange={(e) => updateMemory(m.id, e.target.value)}
            />
          ) : (
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>
              {m.text}
            </p>
          )}
          <div className="row space-between" style={{ marginTop: 12 }}>
            <span
              className="row"
              style={{ fontSize: 13, color: "var(--text-secondary)" }}
            >
              {t(lang, "useMemory")}
              <Switch
                label={m.text}
                on={m.enabled}
                onClick={() => toggleMemory(m.id)}
              />
            </span>
            <span className="row">
              <button
                className="mini-btn press"
                onClick={() => setEditId(editId === m.id ? null : m.id)}
              >
                {editId === m.id ? t(lang, "done") : t(lang, "edit")}
              </button>
              <button
                className="mini-btn press"
                onClick={() => deleteMemory(m.id)}
                aria-label={t(lang, "delete")}
              >
                <IconTrash />
              </button>
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

export function MemoryScreen() {
  const { data, setOverlay, addMemory } = useStore();
  const lang = data.lang;
  const score = contextScore(data);
  const [draft, setDraft] = useState("");
  const work = data.memories.filter((m) => m.category === "work");
  const schedule = data.memories.filter((m) => m.category === "schedule");
  const prefs = data.memories.filter((m) => m.category === "preferences");

  return (
    <div className="screen">
      <header className="topbar" style={{ alignItems: "center" }}>
        <button
          className="icon-btn"
          onClick={() => setOverlay({ name: "none" })}
          aria-label={t(lang, "close")}
        >
          <IconBack />
        </button>
        <div style={{ flex: 1 }}>
          <div className="page-title">{t(lang, "memory")}</div>
          <div className="page-sub">
            {lang === "zh"
              ? "管理用于回答的个人记忆"
              : "Manage the memories used in replies"}
          </div>
        </div>
      </header>
      <div className="screen-body">
        <div className="score-card">
          <div className="row space-between">
            <span className="section-label" style={{ color: "#a5a5ae" }}>
              {lang === "zh" ? "记忆启用比例" : "Memories enabled"}
            </span>
            <span
              className="pill"
              style={{ background: "#2a2a36", color: "#9aa4ff" }}
            >
              {data.prefs.memoryEnabled
                ? t(lang, "memoryAccess")
                : t(lang, "close")}
            </span>
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              marginTop: 8,
            }}
          >
            {score}
            <span style={{ fontSize: 24 }}>%</span>
          </div>
          <div className="bar">
            <span style={{ width: `${score}%` }} />
          </div>
          <div
            className="row space-between"
            style={{ color: "#a5a5ae", fontSize: 12 }}
          >
            <span>
              {data.memories.length} {t(lang, "patternsStored")}
            </span>
          </div>
        </div>

        <div className="section-label" style={{ margin: "24px 0 12px" }}>
          {t(lang, "whatRemembers")}
        </div>
        {data.memories.length === 0 ? (
          <Empty
            title={t(lang, "noMemories")}
            hint={t(lang, "noMemoriesHint")}
            action={t(lang, "addMemory")}
            onAction={() => document.getElementById("memory-draft")?.focus()}
          />
        ) : (
          <>
            {work.length > 0 && (
              <Group title={t(lang, "workProjects")} items={work} />
            )}
            {schedule.length > 0 && (
              <section className="card" style={{ marginBottom: 12 }}>
                <div className="row space-between" style={{ marginBottom: 12 }}>
                  <span className="row">
                    <IconCal day={new Date().getDate()} />
                    <b>{t(lang, "scheduleHabits")}</b>
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                    {schedule.length} {t(lang, "items")}
                  </span>
                </div>
                {schedule.map((m) => (
                  <MemoryLine key={m.id} item={m} />
                ))}
              </section>
            )}
            {prefs.length > 0 && (
              <Group title={t(lang, "preferences")} items={prefs} />
            )}
          </>
        )}

        <div className="card" style={{ marginTop: 8 }}>
          <b>{t(lang, "addMemory")}</b>
          <textarea
            className="field field-area"
            style={{ margin: "12px 0" }}
            id="memory-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t(lang, "noteBody")}
          />
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              if (!draft.trim()) return;
              const cat: MemoryCategory =
                /gym|week|habit|routine|训练|习惯/.test(draft.toLowerCase())
                  ? "schedule"
                  : /prefer|card|偏好/.test(draft.toLowerCase())
                    ? "preferences"
                    : "work";
              addMemory(cat, "Note", draft.trim());
              setDraft("");
            }}
          >
            {t(lang, "add")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemoryLine({ item }: { item: MemoryItem }) {
  const { toggleMemory, deleteMemory, updateMemory, data } = useStore();
  const [editing, setEditing] = useState(false);
  return (
    <div
      className="card"
      style={{
        marginBottom: 8,
        background: "var(--surface-secondary)",
        border: 0,
      }}
    >
      <div className="row space-between">
        <span className="section-label">{item.kind}</span>
        <span className="pill success">{item.enabled ? "✓" : "—"}</span>
      </div>
      {editing ? (
        <textarea
          className="field"
          style={{ marginTop: 8 }}
          value={item.text}
          onChange={(e) => updateMemory(item.id, e.target.value)}
        />
      ) : (
        <p style={{ marginTop: 8, fontSize: 14 }}>{item.text}</p>
      )}
      <div className="row space-between" style={{ marginTop: 10 }}>
        <Switch
          label={item.text}
          on={item.enabled}
          onClick={() => toggleMemory(item.id)}
        />
        <span className="row">
          <button className="mini-btn" onClick={() => setEditing(!editing)}>
            {editing ? t(data.lang, "done") : t(data.lang, "edit")}
          </button>
          <button className="mini-btn" onClick={() => deleteMemory(item.id)}>
            <IconTrash />
          </button>
        </span>
      </div>
    </div>
  );
}
