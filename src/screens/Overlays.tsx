import { useState } from "react";
import { t, languages } from "../i18n";
import { IconTrash } from "../icons";
import { useStore } from "../store";
import { Sheet, Switch } from "../ui";
import type { ThemeMode } from "../types";

export function Overlays() {
  const store = useStore();
  const { data, ui, setOverlay, addNote, updateNote, deleteNote, toggleTask, deleteTask, setTheme, setLang, setPref } = store;
  const lang = data.lang;
  const overlay = ui.overlay;

  if (overlay.name === "none") return null;

  if (overlay.name === "note") {
    const note = data.notes.find((n) => n.id === overlay.noteId);
    return (
      <NoteSheet
        initialTitle={note?.title || ""}
        initialBody={note?.body || ""}
        onClose={() => setOverlay({ name: "none" })}
        onSave={(title, body) => {
          if (note) updateNote(note.id, title, body);
          else addNote(title, body);
          setOverlay({ name: "none" });
        }}
        onDelete={
          note
            ? () => {
                deleteNote(note.id);
                setOverlay({ name: "none" });
              }
            : undefined
        }
      />
    );
  }

  if (overlay.name === "tasks" || overlay.name === "create-task") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "tasks")}</h2>
        <TaskComposer />
        {data.tasks.length === 0 && <p className="page-sub">{t(lang, "noTasksHint")}</p>}
        {data.tasks.map((task) => (
          <div key={task.id} className="list-row">
            <button
              className={"checkbox" + (task.done ? " on" : "")}
              onClick={() => toggleTask(task.id)}
              aria-label={task.title}
            >
              {task.done ? "✓" : ""}
            </button>
            <span className={task.done ? "task-done" : ""} style={{ flex: 1 }}>
              {task.title}
            </span>
            <span className={"pill " + task.category}>{t(lang, task.category)}</span>
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => deleteTask(task.id)}>
              <IconTrash />
            </button>
          </div>
        ))}
      </Sheet>
    );
  }

  if (overlay.name === "saved") {
    const item = data.saved.find((s) => s.id === overlay.id);
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "saved")}</h2>
        {data.saved.length === 0 && <p className="page-sub">{t(lang, "noSavedHint")}</p>}
        {item ? (
          <div className="card" style={{ marginTop: 16 }}>
            <span className="pill ai">AI</span>
            <h3 style={{ marginTop: 8 }}>{item.title}</h3>
            <p className="page-sub">{item.preview}</p>
          </div>
        ) : (
          data.saved.map((s) => (
            <button
              key={s.id}
              className="list-row press"
              onClick={() => setOverlay({ name: "saved", id: s.id })}
            >
              <span style={{ flex: 1, fontWeight: 600 }}>{s.title}</span>
              <span className="pill ai">AI</span>
            </button>
          ))
        )}
      </Sheet>
    );
  }

  if (overlay.name === "summarize") {
    return <LinkSheet />;
  }

  if (overlay.name === "multimodal") {
    const labels = {
      voice: t(lang, "recording"),
      image: t(lang, "analyzingImage"),
      link: t(lang, "analyzingLink"),
      document: t(lang, "analyzingDoc"),
    };
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <h3>{labels[overlay.mode || "voice"]}</h3>
          {overlay.mode === "document" && <p className="page-sub">{t(lang, "mockFile")}</p>}
        </div>
      </Sheet>
    );
  }

  if (overlay.name === "appearance") {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    const labels = [t(lang, "themeSystem"), t(lang, "themeLight"), t(lang, "themeDark")];
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "appearance")}</h2>
        {modes.map((mode, i) => (
          <button key={mode} className="setting-row press" onClick={() => setTheme(mode)}>
            <span>{labels[i]}</span>
            {data.theme === mode && <span className="pill ai">{t(lang, "done")}</span>}
          </button>
        ))}
      </Sheet>
    );
  }

  if (overlay.name === "language") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "language")}</h2>
        {languages.map((item) => (
          <button key={item.id} className="setting-row press" onClick={() => setLang(item.id)}>
            <span>
              {t(lang, item.label)}
              {!item.native && (
                <div className="page-sub">{t(lang, "fallbackNote")}</div>
              )}
            </span>
            {data.lang === item.id && <span className="pill ai">{t(lang, "done")}</span>}
          </button>
        ))}
      </Sheet>
    );
  }

  if (overlay.name === "notifications") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "notifications")}</h2>
        <div className="setting-row">
          <span>{t(lang, "notifPush")}</span>
          <Switch on={data.prefs.notifications} onClick={() => setPref("notifications", !data.prefs.notifications)} />
        </div>
        <div className="setting-row">
          <span>{t(lang, "notifHints")}</span>
          <Switch on={data.prefs.hapticStyle} onClick={() => setPref("hapticStyle", !data.prefs.hapticStyle)} />
        </div>
      </Sheet>
    );
  }

  if (overlay.name === "ai-prefs") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "aiPrefs")}</h2>
        <div className="setting-row">
          <span>{t(lang, "structuredCards")}</span>
          <Switch on={data.prefs.structuredCards} onClick={() => setPref("structuredCards", !data.prefs.structuredCards)} />
        </div>
        <div className="setting-row">
          <span>{t(lang, "voiceReplies")}</span>
          <Switch on={data.prefs.voiceReplies} onClick={() => setPref("voiceReplies", !data.prefs.voiceReplies)} />
        </div>
        <div className="setting-row">
          <span>{t(lang, "memoryAccess")}</span>
          <Switch on={data.prefs.memoryEnabled} onClick={() => setPref("memoryEnabled", !data.prefs.memoryEnabled)} />
        </div>
      </Sheet>
    );
  }

  if (overlay.name === "about") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "about")}</h2>
        <p className="page-sub" style={{ marginTop: 12 }}>{t(lang, "aboutBody")}</p>
        <p className="page-sub">{t(lang, "version")}</p>
      </Sheet>
    );
  }

  if (overlay.name === "account") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "account")}</h2>
        <p className="page-sub" style={{ marginTop: 12 }}>{t(lang, "guestAccount")}</p>
        <p className="page-sub">{t(lang, "signedIn")}</p>
      </Sheet>
    );
  }

  return null;
}

function NoteSheet({
  initialTitle,
  initialBody,
  onClose,
  onSave,
  onDelete,
}: {
  initialTitle: string;
  initialBody: string;
  onClose: () => void;
  onSave: (title: string, body: string) => void;
  onDelete?: () => void;
}) {
  const { data } = useStore();
  const lang = data.lang;
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  return (
    <Sheet onClose={onClose}>
      <h2>{t(lang, "notes")}</h2>
      <input className="field" style={{ marginTop: 16 }} value={title} placeholder={t(lang, "noteTitle")} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field field-area" style={{ marginTop: 12 }} value={body} placeholder={t(lang, "noteBody")} onChange={(e) => setBody(e.target.value)} />
      <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => onSave(title, body)}>
        {t(lang, "save")}
      </button>
      {onDelete && (
        <button className="btn btn-ghost btn-block" onClick={onDelete}>
          {t(lang, "delete")}
        </button>
      )}
    </Sheet>
  );
}

function TaskComposer() {
  const { data, addTask } = useStore();
  const [title, setTitle] = useState("");
  return (
    <form
      className="row"
      style={{ margin: "16px 0" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        addTask(title.trim());
        setTitle("");
      }}
    >
      <input className="field" value={title} placeholder={t(data.lang, "taskPlaceholder")} onChange={(e) => setTitle(e.target.value)} />
      <button className="btn btn-primary" type="submit">
        {t(data.lang, "add")}
      </button>
    </form>
  );
}

function LinkSheet() {
  const { data, setOverlay, runMultimodal } = useStore();
  const [url, setUrl] = useState("https://");
  const lang = data.lang;
  return (
    <Sheet onClose={() => setOverlay({ name: "none" })}>
      <h2>{t(lang, "summarizePage")}</h2>
      <input className="field" style={{ marginTop: 16 }} value={url} placeholder={t(lang, "pasteUrl")} onChange={(e) => setUrl(e.target.value)} />
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 16 }}
        onClick={() => void runMultimodal("link", url)}
      >
        {t(lang, "summarize")}
      </button>
    </Sheet>
  );
}
