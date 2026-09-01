import { t } from "../i18n";
import {
  IconChart,
  IconCheckBox,
  IconChevron,
  IconClipboard,
  IconLink,
  IconPen,
  IconPlane,
  IconSpark,
} from "../icons";
import { useStore } from "../store";

export function ActionsScreen() {
  const { data, setTab, setOverlay, openWeeklyFrom, runMultimodal, sendMessage } = useStore();
  const lang = data.lang;

  const cards = [
    { id: "week", title: t(lang, "planWeek"), sub: t(lang, "planWeekSub"), icon: <IconClipboard />, run: () => openWeeklyFrom() },
    { id: "notes", title: t(lang, "writeNotes"), sub: t(lang, "writeNotesSub"), icon: <IconPen />, run: () => setOverlay({ name: "note" }) },
    { id: "sum", title: t(lang, "summarizePage"), sub: t(lang, "summarizePageSub"), icon: <IconLink />, run: () => setOverlay({ name: "summarize" }) },
    { id: "tasks", title: t(lang, "createTasks"), sub: t(lang, "createTasksSub"), icon: <IconCheckBox />, run: () => setOverlay({ name: "create-task" }) },
    { id: "analyze", title: t(lang, "analyzeContent"), sub: t(lang, "analyzeContentSub"), icon: <IconChart />, run: () => void runMultimodal("image") },
    {
      id: "trip",
      title: t(lang, "planTrip"),
      sub: t(lang, "planTripSub"),
      icon: <IconPlane />,
      run: () => {
        setTab("chat");
        void sendMessage(lang === "zh" ? "规划行程" : "Plan a trip");
      },
    },
  ];

  return (
    <div className="screen">
      <header className="topbar" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div className="page-title">{t(lang, "actionsTitle")}</div>
        <div className="page-sub">{t(lang, "actionsSub")}</div>
      </header>
      <div className="screen-body">
        <div className="section-label" style={{ marginBottom: 12 }}>{t(lang, "quickStart")}</div>
        <button
          className="ask-card press"
          onClick={() => setTab("chat")}
        >
          <span className="icon-tile" style={{ background: "#2a2a36", color: "#fff" }}>
            <IconSpark />
          </span>
          <span style={{ flex: 1 }}>
            <b>{t(lang, "askAnything")}</b>
            <small>{t(lang, "askAnythingSub")}</small>
          </span>
          <IconChevron />
        </button>
        <div className="action-grid" style={{ marginTop: 16 }}>
          {cards.map((c) => (
            <button key={c.id} className="action-card press" onClick={c.run}>
              <span className="icon-tile">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
