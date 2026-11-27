import { useMemo, useState } from "react";
import { formatRange, formatTime, isoDate } from "../dates";
import { t } from "../i18n";
import { IconBack, IconDots, IconRegen } from "../icons";
import { useStore } from "../store";
import { planTasks, days } from "../planning";

export function WeeklyPlanScreen({ planId }: { planId: string }) {
  const {
    data,
    setOverlay,
    saveCard,
    convertTasks,
    regeneratePlan,
    editPlanItem,
    ui,
    cancel,
  } = useStore();
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
          <button
            className="icon-btn"
            onClick={() => setOverlay({ name: "none" })}
          >
            <IconBack />
          </button>
        </header>
      </div>
    );
  }

  const anchor = plan.weekOf || isoDate(new Date(plan.generatedAt));

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
        <div
          style={{
            flex: 1,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          {t(lang, "chatWeekly")}
        </div>
        <button
          className="icon-btn"
          onClick={() =>
            void import("../calendar").then((m) =>
              m.downloadCalendar(plan, data.prefs.notifications),
            )
          }
          title={lang === "zh" ? "导出日历 (.ics)" : "Export calendar (.ics)"}
          aria-label={lang === "zh" ? "导出日历" : "Export calendar"}
        >
          <IconDots />
        </button>
      </header>
      <div className="screen-body" style={{ paddingBottom: 140 }}>
        <span className="pill ai">
          ● {t(lang, "aiGenerated").toUpperCase()}
        </span>
        <h1 className="page-title" style={{ marginTop: 12 }}>
          {t(lang, "weeklyPlan")}
        </h1>
        <h2 className="page-title" style={{ fontSize: 24 }}>
          {formatRange(anchor, lang)}
        </h2>
        <p className="page-sub">
          {t(lang, "generated")} · {formatTime(plan.generatedAt, lang)} ·{" "}
          {plan.items.length} {t(lang, "tasks").toLowerCase()}
        </p>
        <div style={{ margin: "16px 0" }}>
          {ui.generating && (
            <button className="mini-btn" onClick={cancel}>
              {lang === "zh" ? "取消" : "Cancel"}
            </button>
          )}
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
                  <span
                    className={
                      "dot " +
                      (item.category === "work"
                        ? ""
                        : item.category === "health"
                          ? "health"
                          : "study")
                    }
                  />
                  {editing ? (
                    <div style={{ flex: 1 }}>
                      <input
                        aria-label={lang === "zh" ? "项目" : "Title"}
                        value={item.title}
                        onChange={(e) =>
                          editPlanItem(plan.id, item.id, {
                            title: e.target.value,
                          })
                        }
                      />
                      <select
                        aria-label={lang === "zh" ? "星期" : "Day"}
                        value={item.day}
                        onChange={(e) =>
                          editPlanItem(plan.id, item.id, {
                            day: e.target.value,
                          })
                        }
                      >
                        {days.map((day) => (
                          <option key={day}>{day}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        aria-label={lang === "zh" ? "时间" : "Time"}
                        value={item.time || ""}
                        onChange={(e) =>
                          editPlanItem(plan.id, item.id, {
                            time: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, fontWeight: 600 }}>
                      {item.time && <small>{item.time} · </small>}
                      {item.title}
                    </div>
                  )}
                  <span className={"pill " + item.category}>
                    {t(lang, item.category)}
                  </span>
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
              `${t(lang, "weeklyPlan")} · ${formatRange(anchor, lang)}`,
              plan.items[0]?.title || "",
              { planId: plan.id },
            )
          }
        >
          {t(lang, "save")}
        </button>
        <button
          className="btn btn-secondary press"
          style={{
            color: "var(--tag-work)",
            borderColor: "var(--tag-work-soft)",
            background: "var(--tag-work-soft)",
          }}
          onClick={() => convertTasks(planTasks(plan))}
        >
          → {t(lang, "convertTasks")}
        </button>
        <button
          className="btn btn-secondary press"
          onClick={() => setEditing(!editing)}
        >
          {editing ? t(lang, "done") : t(lang, "edit")}
        </button>
        <button
          className="btn btn-secondary press"
          onClick={() => void regeneratePlan(plan.id)}
          aria-label={t(lang, "regenerate")}
        >
          <IconRegen />
        </button>
      </div>
    </div>
  );
}
