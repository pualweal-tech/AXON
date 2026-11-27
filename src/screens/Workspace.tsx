import { api, type RunInfo } from "../api";
import { useEffect, useMemo, useState } from "react";
import { relativeLabel, isoDate } from "../dates";
import { t } from "../i18n";
import {
  IconChat,
  IconCheckBox,
  IconNote,
  IconSearch,
  IconSpark,
} from "../icons";
import { useStore } from "../store";
import { DateStrip, Empty } from "../ui";

export function WorkspaceScreen() {
  const { data, setOverlay, setTab, convertTasks, toast, restoreRun } =
    useStore();
  const lang = data.lang;
  const [q, setQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [runs, setRuns] = useState<RunInfo[]>([]),
    [runError, setRunError] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true,
      timer: number | undefined;
    api
      .runs()
      .then((r) => {
        if (!live) return;
        setRuns(r.runs);
        setRunError(false);
        if (r.runs.some((j) => j.status === "running"))
          timer = window.setTimeout(() => setRefresh((v) => v + 1), 5000);
      })
      .catch(() => {
        if (live) setRunError(true);
      });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  const today = isoDate();
  const [allNotes, setAllNotes] = useState(false);
  const [byDate, setByDate] = useState(false);
  const notes = data.notes.filter(
    (n) =>
      (!byDate || isoDate(new Date(n.updatedAt)) === data.selectedDate) &&
      (n.title + " " + n.body).toLowerCase().includes(q.toLowerCase()),
  );
  const tasks = data.tasks.filter(
    (n) =>
      (!byDate || n.date === data.selectedDate) &&
      n.title.toLowerCase().includes(q.toLowerCase()),
  );
  const saved = data.saved.filter(
    (n) =>
      (!byDate || isoDate(new Date(n.createdAt)) === data.selectedDate) &&
      (n.title + " " + n.preview).toLowerCase().includes(q.toLowerCase()),
  );
  const activeTasks = useMemo(
    () => tasks.filter((x) => !x.done).length,
    [tasks],
  );

  return (
    <div className="screen">
      <header className="topbar">
        <div className="page-title">{t(lang, "workspace")}</div>
        <button
          className="icon-btn"
          onClick={() => {
            if (showSearch) setQ("");
            setShowSearch(!showSearch);
          }}
          aria-label={t(lang, "search")}
        >
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
        <DateStrip onSelect={() => setByDate(true)} />
        {byDate && (
          <button className="mini-btn" onClick={() => setByDate(false)}>
            {lang === "zh" ? "全部日期" : "All dates"}
          </button>
        )}
        <label className="mini-btn" style={{ cursor: "pointer" }}>
          {lang === "zh"
            ? "导入本周日历 (.ics)"
            : "Import this week’s calendar (.ics)"}
          <input
            type="file"
            accept=".ics,text/calendar"
            style={{ width: 1, height: 1, opacity: 0 }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 1500000) throw Error();
                const { importWeek } = await import("../calendar");
                const items = await importWeek(
                  await file.text(),
                  data.selectedDate,
                );
                if (!items.length) {
                  toast(
                    lang === "zh" ? "当周没有日历事件" : "No events this week",
                  );
                  return;
                }
                if (
                  confirm(
                    (lang === "zh"
                      ? "导入日程条数："
                      : "Import calendar events: ") + items.length,
                  )
                )
                  convertTasks(items);
              } catch {
                toast(
                  lang === "zh"
                    ? "无法读取日历，请检查内容和大小。"
                    : "Unable to read this calendar.",
                );
              }
            }}
          />
        </label>
        <div className="stats" style={{ marginTop: 16 }}>
          <button
            className="stat press"
            onClick={() => setOverlay({ name: "note" })}
          >
            <b>{data.notes.length}</b>
            <span>{t(lang, "notes")}</span>
          </button>
          <button
            className="stat press"
            onClick={() => setOverlay({ name: "tasks" })}
          >
            <b>{data.tasks.length}</b>
            <span>{t(lang, "tasks")}</span>
          </button>
          <button
            className="stat press"
            onClick={() => setOverlay({ name: "saved" })}
          >
            <b>{data.saved.length}</b>
            <span>{t(lang, "saved")}</span>
          </button>
        </div>
        <div className="section-label" style={{ margin: "24px 0 4px" }}>
          {t(lang, "categories")}
        </div>

        <section className="group">
          <button
            className="group-head press"
            style={{ width: "100%" }}
            onClick={() => setAllNotes(!allNotes)}
          >
            <span className="row">
              <IconNote /> <b>{t(lang, "notes")}</b>
            </span>
            <span className="pill manual">
              {notes.length} {t(lang, "items")}
            </span>
          </button>
          {notes.length === 0 ? (
            <Empty
              title={t(lang, "noNotes")}
              hint={t(lang, "noNotesHint")}
              action={t(lang, "createNote")}
              onAction={() => setOverlay({ name: "note" })}
            />
          ) : (
            (allNotes || q ? notes : notes.slice(0, 3)).map((n) => (
              <button
                key={n.id}
                className="list-row press"
                onClick={() => setOverlay({ name: "note", noteId: n.id })}
              >
                <IconSpark size={14} />
                <span style={{ flex: 1, fontWeight: 600 }}>{n.title}</span>
                <span className={"pill " + n.source}>
                  {n.source === "ai" ? "AI" : lang === "zh" ? "手动" : "Manual"}
                </span>
                <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                  {relativeLabel(isoDate(new Date(n.updatedAt)), today, lang)}
                </span>
              </button>
            ))
          )}
        </section>

        <section className="group">
          <button
            className="group-head press"
            style={{ width: "100%" }}
            onClick={() => setOverlay({ name: "tasks" })}
          >
            <span className="row">
              <IconCheckBox /> <b>{t(lang, "tasks")}</b>
            </span>
            <span className="pill manual">
              {activeTasks} {t(lang, "active")}
            </span>
          </button>
          {tasks.length === 0 ? (
            <Empty
              title={t(lang, "noTasks")}
              hint={t(lang, "noTasksHint")}
              action={t(lang, "addTask")}
              onAction={() => setOverlay({ name: "create-task" })}
            />
          ) : (
            tasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                className="list-row press"
                onClick={() => setOverlay({ name: "tasks" })}
              >
                <span
                  className={
                    "dot " + (task.category === "work" ? "" : task.category)
                  }
                />
                <span
                  className={task.done ? "task-done" : ""}
                  style={{ flex: 1, fontWeight: 600 }}
                >
                  {task.title}
                </span>
                <span
                  className={"pill " + (task.source === "ai" ? "ai" : "manual")}
                >
                  {task.source === "ai" ? "AI" : "manual"}
                </span>
              </button>
            ))
          )}
        </section>

        <section className="group">
          <button
            className="group-head press"
            style={{ width: "100%" }}
            onClick={() => setOverlay({ name: "saved" })}
          >
            <span className="row">
              <IconChat size={16} /> <b>{t(lang, "saved")}</b>
            </span>
            <span className="pill manual">
              {saved.length} {t(lang, "saved").toLowerCase()}
            </span>
          </button>
          {saved.length === 0 ? (
            <Empty
              title={t(lang, "noSaved")}
              hint={t(lang, "noSavedHint")}
              action={t(lang, "startChat")}
              onAction={() => setTab("chat")}
            />
          ) : (
            saved.slice(0, 3).map((s) => (
              <button
                key={s.id}
                className="list-row press"
                onClick={() => setOverlay({ name: "saved", id: s.id })}
              >
                <span className="dot grey" />
                <span style={{ flex: 1, fontWeight: 600 }}>{s.title}</span>
                <span className="pill ai">AI</span>
              </button>
            ))
          )}
        </section>
        {runError && (
          <button className="mini-btn" onClick={() => setRefresh((v) => v + 1)}>
            {lang === "zh" ? "重试加载运行记录" : "Retry loading recent runs"}
          </button>
        )}
        {runs.length > 0 && (
          <section className="group">
            <div className="group-head">
              {lang === "zh"
                ? "最近 24 小时的运行"
                : "Runs in the last 24 hours"}
            </div>
            {runs.map((job) => (
              <button
                key={job.id}
                className="list-row"
                disabled={job.status === "running"}
                onClick={() => void restoreRun(job)}
              >
                {job.label} ·{" "}
                {job.status === "done"
                  ? lang === "zh"
                    ? "打开结果"
                    : "Open result"
                  : job.status === "running"
                    ? lang === "zh"
                      ? "进行中"
                      : "Running"
                    : lang === "zh"
                      ? "重试"
                      : "Retry"}
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
