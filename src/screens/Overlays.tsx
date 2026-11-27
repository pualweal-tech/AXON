import { api } from "../api";
import { card as cardSchema } from "../schema";
import { useState } from "react";
import { t, languages } from "../i18n";
import { IconTrash } from "../icons";
import { useStore } from "../store";
import { Sheet, Switch } from "../ui";
import type { AIProvider, ThemeMode } from "../types";

export function Overlays() {
  const store = useStore();
  const {
    data,
    ui,
    setOverlay,
    addNote,
    updateNote,
    deleteNote,
    toggleTask,
    deleteTask,
    setTheme,
    setLang,
    setPref,
  } = store;
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
        {data.tasks.length === 0 && (
          <p className="page-sub">{t(lang, "noTasksHint")}</p>
        )}
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
            <small>
              {task.date} {task.time}
            </small>
            <span className={"pill " + task.category}>
              {t(lang, task.category)}
            </span>
            <button
              className="icon-btn"
              style={{ width: 32, height: 32 }}
              onClick={() => deleteTask(task.id)}
            >
              <IconTrash />
            </button>
          </div>
        ))}
      </Sheet>
    );
  }

  if (overlay.name === "saved") {
    const item = data.saved.find((s) => s.id === overlay.id);
    const card = cardSchema.safeParse(item?.payload);
    const planId = (item?.payload as { planId?: string } | null)?.planId;
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "saved")}</h2>
        {data.saved.length === 0 && (
          <p className="page-sub">{t(lang, "noSavedHint")}</p>
        )}
        {item ? (
          <div className="card" style={{ marginTop: 16 }}>
            <span className="pill ai">AI</span>
            <h3 style={{ marginTop: 8 }}>{item.title}</h3>
            <p className="page-sub">{item.preview}</p>
            {card.success && (
              <>
                <ul>
                  {card.data.bullets?.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
                {card.data.tasks?.map((v, i) => (
                  <p key={i}>
                    {v.title} · {t(lang, v.category)}
                  </p>
                ))}
              </>
            )}
            {planId && data.plans.some((p) => p.id === planId) && (
              <button
                className="mini-btn"
                onClick={() => store.openWeeklyFrom(planId)}
              >
                {t(lang, "weeklyPlan")}
              </button>
            )}
            <button
              className="mini-btn"
              onClick={() => {
                store.deleteSaved(item.id);
                setOverlay({ name: "saved" });
              }}
            >
              {t(lang, "delete")}
            </button>
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
      <Sheet
        onClose={() => {
          store.cancel();
          setOverlay({ name: "none" });
        }}
      >
        <div style={{ textAlign: "center", padding: 32 }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <h3>{labels[overlay.mode || "voice"]}</h3>
          <button
            className="mini-btn"
            onClick={() => {
              store.cancel();
              setOverlay({ name: "none" });
            }}
          >
            {t(lang, "close")}
          </button>
        </div>
      </Sheet>
    );
  }

  if (overlay.name === "appearance") {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    const labels = [
      t(lang, "themeSystem"),
      t(lang, "themeLight"),
      t(lang, "themeDark"),
    ];
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "appearance")}</h2>
        {modes.map((mode, i) => (
          <button
            key={mode}
            className="setting-row press"
            onClick={() => setTheme(mode)}
          >
            <span>{labels[i]}</span>
            {data.theme === mode && (
              <span className="pill ai">{t(lang, "done")}</span>
            )}
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
          <button
            key={item.id}
            className="setting-row press"
            onClick={() => setLang(item.id)}
          >
            <span>
              {t(lang, item.label)}
              {!item.native && (
                <div className="page-sub">{t(lang, "fallbackNote")}</div>
              )}
            </span>
            {data.lang === item.id && (
              <span className="pill ai">{t(lang, "done")}</span>
            )}
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
          <span>
            {lang === "zh"
              ? "导出日历时附加提醒"
              : "Include reminders in calendar exports"}
          </span>
          <Switch
            label={lang === "zh" ? "日历提醒" : "Calendar reminders"}
            on={data.prefs.notifications}
            onClick={() => setPref("notifications", !data.prefs.notifications)}
          />
        </div>
        <div className="setting-row">
          <span>
            {lang === "zh"
              ? "应用打开时提醒到期任务"
              : "Remind me of due tasks while AXON is open"}
          </span>
          <Switch
            label={lang === "zh" ? "到期提醒" : "Due task reminders"}
            on={data.prefs.hapticStyle}
            onClick={() => setPref("hapticStyle", !data.prefs.hapticStyle)}
          />
        </div>
      </Sheet>
    );
  }

  if (overlay.name === "ai-prefs") {
    return <AiPrefsSheet />;
  }

  if (overlay.name === "about") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "about")}</h2>
        <p className="page-sub" style={{ marginTop: 12 }}>
          {t(lang, "aboutBody")}
        </p>
        <p className="page-sub">{t(lang, "version")}</p>
      </Sheet>
    );
  }

  if (overlay.name === "account") {
    return (
      <Sheet onClose={() => setOverlay({ name: "none" })}>
        <h2>{t(lang, "account")}</h2>
        <p className="page-sub" style={{ marginTop: 12 }}>
          {store.user?.name || t(lang, "axon")}
        </p>
        <p className="page-sub">{store.user?.email}</p>
        <AccountActions />
      </Sheet>
    );
  }

  return null;
}

function AiPrefsSheet() {
  const { data, keys, setOverlay, setPref, setProvider, saveApiKey, toast } =
    useStore();
  const lang = data.lang;
  const provider = data.prefs.aiProvider;
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const providers: { id: AIProvider; label: ReturnType<typeof t> }[] = [
    { id: "openai", label: t(lang, "chatgpt") },
    { id: "grok", label: t(lang, "grok") },
    { id: "deepseek", label: t(lang, "deepseek") },
  ];
  const hasKey = keys[provider];

  return (
    <Sheet onClose={() => setOverlay({ name: "none" })}>
      <h2>{t(lang, "aiPrefs")}</h2>
      <div
        className="setting-row"
        style={{ display: "block", paddingBottom: 8 }}
      >
        <div style={{ marginBottom: 10 }}>{t(lang, "aiProvider")}</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {providers.map((item) => (
            <button
              key={item.id}
              className={"mode-chip" + (provider === item.id ? " on" : "")}
              onClick={() => {
                setProvider(item.id);
                setSecret("");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="page-sub" style={{ marginTop: 8 }}>
        {t(lang, "apiKeyHint")}
        {hasKey
          ? lang === "zh"
            ? " · 使用个人密钥"
            : " · Personal key selected"
          : keys.shared?.[provider]
            ? lang === "zh"
              ? " · 使用服务端额度"
              : " · Deployment-funded key selected"
            : lang === "zh"
              ? " · 尚无可用密钥"
              : " · No key configured"}
      </p>
      <input
        className="field"
        style={{ marginTop: 12 }}
        type="password"
        value={secret}
        placeholder={t(lang, "apiKey")}
        autoComplete="off"
        onChange={(e) => setSecret(e.target.value)}
      />
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 12 }}
        disabled={busy || !secret.trim()}
        onClick={() => {
          setBusy(true);
          void saveApiKey(provider, secret.trim())
            .then(() => setSecret(""))
            .catch(() => toast(t(lang, "requestFailed")))
            .finally(() => setBusy(false));
        }}
      >
        {t(lang, "saveKey")}
      </button>
      {hasKey && (
        <button
          className="btn btn-ghost btn-block"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void saveApiKey(provider, null)
              .catch(() => toast(t(lang, "requestFailed")))
              .finally(() => setBusy(false));
          }}
        >
          {t(lang, "removeKey")}
        </button>
      )}
      <div className="setting-row">
        <span>{t(lang, "structuredCards")}</span>
        <Switch
          label={t(lang, "structuredCards")}
          on={data.prefs.structuredCards}
          onClick={() =>
            setPref("structuredCards", !data.prefs.structuredCards)
          }
        />
      </div>
      <div className="setting-row">
        <span>{t(lang, "voiceReplies")}</span>
        <Switch
          label={t(lang, "voiceReplies")}
          on={data.prefs.voiceReplies}
          onClick={() => setPref("voiceReplies", !data.prefs.voiceReplies)}
        />
      </div>
      <div className="setting-row">
        <span>{t(lang, "memoryAccess")}</span>
        <Switch
          label={t(lang, "memoryAccess")}
          on={data.prefs.memoryEnabled}
          onClick={() => setPref("memoryEnabled", !data.prefs.memoryEnabled)}
        />
      </div>
    </Sheet>
  );
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
      <input
        className="field"
        style={{ marginTop: 16 }}
        value={title}
        placeholder={t(lang, "noteTitle")}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="field field-area"
        style={{ marginTop: 12 }}
        value={body}
        placeholder={t(lang, "noteBody")}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 16 }}
        onClick={() => onSave(title, body)}
      >
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
      <input
        className="field"
        value={title}
        placeholder={t(data.lang, "taskPlaceholder")}
        onChange={(e) => setTitle(e.target.value)}
      />
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
      <input
        className="field"
        style={{ marginTop: 16 }}
        value={url}
        placeholder={t(lang, "pasteUrl")}
        onChange={(e) => setUrl(e.target.value)}
      />
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

function AccountActions() {
  const { data, exportData, toast, user } = useStore();
  const [action, setAction] = useState<
    "password" | "delete" | "recovery" | null
  >(null);
  const [password, setPassword] = useState(""),
    [next, setNext] = useState(""),
    [busy, setBusy] = useState(false);
  const zh = data.lang === "zh";
  async function submit() {
    if (!action) return;
    if (
      action === "delete" &&
      !window.confirm(
        zh
          ? "永久删除账号和所有已保存的数据？"
          : "Permanently delete this account and its data?",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await api.account(
        action,
        password,
        action === "password" ? next : undefined,
      );
      if (action === "delete") {
        for (const k of Object.keys(localStorage))
          if (
            k === "axon:data:" + user?.id ||
            k.startsWith("axon:pending:" + user?.id + ":")
          )
            localStorage.removeItem(k);
        localStorage.setItem("axon-session-event", crypto.randomUUID());
        location.reload();
        return;
      }
      if (result.recovery)
        window.prompt(
          zh ? "请保存新的恢复码" : "Save your new recovery code",
          result.recovery,
        );
      setAction(null);
      setPassword("");
      setNext("");
    } catch {
      toast(t(data.lang, "requestFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="setting-row" onClick={exportData}>
        {zh ? "导出工作区" : "Export workspace"}
      </button>
      {(["password", "recovery", "delete"] as const).map((a, i) => (
        <button
          key={a}
          className="setting-row"
          onClick={() => {
            setAction(a);
            setPassword("");
            setNext("");
          }}
        >
          {
            (zh
              ? ["更改密码", "更换恢复码", "删除账号"]
              : ["Change password", "Rotate recovery code", "Delete account"])[
              i
            ]
          }
        </button>
      ))}
      {action && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            aria-label={zh ? "当前密码" : "Current password"}
            placeholder={zh ? "当前密码" : "Current password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {action === "password" && (
            <input
              className="field"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              placeholder={zh ? "新密码" : "New password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          )}
          <button className="btn btn-primary" disabled={busy || !password}>
            {t(data.lang, "done")}
          </button>
        </form>
      )}
    </>
  );
}
