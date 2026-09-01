import { useMemo, useState } from "react";
import { relativeLabel, isoDate } from "../dates";
import { t } from "../i18n";
import { IconChat, IconCheckBox, IconNote, IconSearch, IconSpark } from "../icons";
import { useStore } from "../store";
import { DateStrip, Empty } from "../ui";

export function WorkspaceScreen() {
  const { data, setOverlay, setTab } = useStore();
  const lang = data.lang;
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const today = isoDate();
  const notes = data.notes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()));
  const tasks = data.tasks.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()));
  const saved = data.saved.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()));
  const activeTasks = useMemo(() => tasks.filter((x) => !x.done).length, [tasks]);

  return (
    <div className="screen">
      <header className="topbar">
        <div className="page-title">{t(lang, "workspace")}</div>
        <button className="icon-btn" onClick={() => setShowSearch(!showSearch)} aria-label={t(lang, "search")}>
          <IconSearch />
        </button>
      </header>
      <div className="screen-body" style={{ paddingTop: 0 }}>
        {showSearch && (
          <input
            className="field"
            style={{ marginBottom: 16 }}
            placeholder={t(lang, "search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        )}
        <DateStrip />
        <div className="stats" style={{ marginTop: 16 }}>
          <button className="stat press" onClick={() => setOverlay({ name: "note" })}>
            <b>{data.notes.length}</b>
            <span>{t(lang, "notes")}</span>
          </button>
          <button className="stat press" onClick={() => setOverlay({ name: "tasks" })}>
            <b>{data.tasks.length}</b>
            <span>{t(lang, "tasks")}</span>
          </button>
          <button className="stat press" onClick={() => setOverlay({ name: "saved" })}>
            <b>{data.saved.length}</b>
            <span>{t(lang, "saved")}</span>
          </button>
        </div>
        <div className="section-label" style={{ margin: "24px 0 4px" }}>{t(lang, "categories")}</div>

        <section className="group">
          <button className="group-head press" style={{ width: "100%" }} onClick={() => setOverlay({ name: "note" })}>
            <span className="row"><IconNote /> <b>{t(lang, "notes")}</b></span>
            <span className="pill manual">{notes.length} {t(lang, "items")}</span>
          </button>
          {notes.length === 0 ? (
            <Empty title={t(lang, "noNotes")} hint={t(lang, "noNotesHint")} action={t(lang, "createNote")} onAction={() => setOverlay({ name: "note" })} />
          ) : (
            notes.slice(0, 3).map((n) => (
              <button key={n.id} className="list-row press" onClick={() => setOverlay({ name: "note", noteId: n.id })}>
                <IconSpark size={14} />
                <span style={{ flex: 1, fontWeight: 600 }}>{n.title}</span>
                <span className="pill ai">AI</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                  {relativeLabel(new Date(n.updatedAt).toISOString().slice(0, 10), today, lang)}
                </span>
              </button>
            ))
          )}
        </section>

        <section className="group">
          <button className="group-head press" style={{ width: "100%" }} onClick={() => setOverlay({ name: "tasks" })}>
            <span className="row"><IconCheckBox /> <b>{t(lang, "tasks")}</b></span>
            <span className="pill manual">{activeTasks} {t(lang, "active")}</span>
          </button>
          {tasks.length === 0 ? (
            <Empty title={t(lang, "noTasks")} hint={t(lang, "noTasksHint")} action={t(lang, "addTask")} onAction={() => setOverlay({ name: "create-task" })} />
          ) : (
            tasks.slice(0, 3).map((task) => (
              <button key={task.id} className="list-row press" onClick={() => setOverlay({ name: "tasks" })}>
                <span className={"dot " + (task.category === "work" ? "" : task.category)} />
                <span className={task.done ? "task-done" : ""} style={{ flex: 1, fontWeight: 600 }}>{task.title}</span>
                <span className={"pill " + (task.source === "ai" ? "ai" : "manual")}>{task.source === "ai" ? "AI" : "manual"}</span>
              </button>
            ))
          )}
        </section>

        <section className="group">
          <button className="group-head press" style={{ width: "100%" }} onClick={() => setOverlay({ name: "saved" })}>
            <span className="row"><IconChat size={16} /> <b>{t(lang, "saved")}</b></span>
            <span className="pill manual">{saved.length} {t(lang, "saved").toLowerCase()}</span>
          </button>
          {saved.length === 0 ? (
            <Empty title={t(lang, "noSaved")} hint={t(lang, "noSavedHint")} action={t(lang, "startChat")} onAction={() => setTab("chat")} />
          ) : (
            saved.slice(0, 3).map((s) => (
              <button key={s.id} className="list-row press" onClick={() => setOverlay({ name: "saved", id: s.id })}>
                <span className="dot grey" />
                <span style={{ flex: 1, fontWeight: 600 }}>{s.title}</span>
                <span className="pill ai">AI</span>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
