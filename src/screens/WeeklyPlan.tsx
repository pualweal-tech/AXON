import { useMemo, useState } from "react";
import { formatRange, formatTime } from "../dates";
import { t } from "../i18n";
import { IconBack, IconDots, IconRegen } from "../icons";
import { useStore } from "../store";
import { DateStrip } from "../ui";

export function WeeklyPlanScreen({ planId }: { planId: string }) {
  const { data, setOverlay, saveCard, convertTasks, regeneratePlan, editPlanItem, ui } = useStore();
  const lang = data.lang;
  const plan = data.plans.find((p) => p.id === planId);
  const [editing, setEditing] = useState(false);
  const grouped = useMemo(() => {
    const map: Record<string, NonNullable<typeof plan>["items"]> = {};
    plan?.items.forEach((item) => {
      map[item.day] = map[item.day] || [];
      map[item.day].push(item);
    });
    return map;
  }, [plan]);

  if (!plan) {
    return (
      <div className="screen">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOverlay({ name: "none" })}>
            <IconBack />
          </button>
        </header>
      </div>
    );
  }

  const events = plan.items.filter((i) => i.category === "health").length;

  return (
    <div className="screen">
      <header className="topbar" style={{ alignItems: "center" }}>
        <button className="icon-btn" onClick={() => setOverlay({ name: "none" })} aria-label={t(lang, "close")}>
          <IconBack />
        </button>
        <div style={{ flex: 1, textAlign: "center", color: "var(--text-secondary)", fontWeight: 500 }}>
          {t(lang, "chatWeekly")}
        </div>
        <button className="icon-btn" aria-label={t(lang, "more")}>
          <IconDots />
        </button>
      </header>
      <div className="screen-body" style={{ paddingBottom: 140 }}>
        <span className="pill ai">● {t(lang, "aiGenerated").toUpperCase()}</span>
        <h1 className="page-title" style={{ marginTop: 12 }}>
          {t(lang, "weeklyPlan")}
        </h1>
        <h2 className="page-title" style={{ fontSize: 24 }}>{formatRange(data.selectedDate, lang)}</h2>
        <p className="page-sub">
          {t(lang, "generated")} · {formatTime(plan.generatedAt, lang)} · {plan.items.length} {t(lang, "tasks").toLowerCase()} · {events} {t(lang, "events")}
        </p>
        <div style={{ margin: "16px 0" }}>
          <DateStrip />
        </div>
        {ui.generating ? (
          <div>
            <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 64 }} />
          </div>
        ) : (
          Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div className="day-head">{day}</div>
              {items.map((item) => (
                <div className="week-item" key={item.id}>
                  <span className={"dot " + (item.category === "work" ? "" : item.category === "health" ? "health" : "study")} />
                  {editing ? (
                    <input
                      value={item.title}
                      onChange={(e) => editPlanItem(plan.id, item.id, e.target.value)}
                    />
                  ) : (
                    <div style={{ flex: 1, fontWeight: 600 }}>{item.title}</div>
                  )}
                  <span className={"pill " + item.category}>{t(lang, item.category)}</span>
                </div>
              ))}
            </div>
          ))
        )}
        <div style={{ height: 8 }} />
      </div>
      <div className="plan-toolbar">
        <button
          className="btn btn-primary press"
          onClick={() =>
            saveCard(
              "weekly",
              `${t(lang, "weeklyPlan")} · ${formatRange(data.selectedDate, lang)}`,
              plan.items[0]?.title || "",
              { planId: plan.id },
            )
          }
        >
          {t(lang, "save")}
        </button>
        <button
          className="btn btn-secondary press"
          style={{ color: "var(--tag-work)", borderColor: "var(--tag-work-soft)", background: "var(--tag-work-soft)" }}
          onClick={() => convertTasks(plan.items.map((i) => ({ title: i.title, category: i.category })))}
        >
          → {t(lang, "convertTasks")}
        </button>
        <button className="btn btn-secondary press" onClick={() => setEditing(!editing)}>
          {editing ? t(lang, "done") : t(lang, "edit")}
        </button>
        <button className="btn btn-secondary press" onClick={() => void regeneratePlan(plan.id)} aria-label={t(lang, "regenerate")}>
          <IconRegen />
        </button>
      </div>
    </div>
  );
}
