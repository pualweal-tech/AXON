import { planTasks } from "../planning";
import { useState } from "react";
import {
  formatRange,
  formatRangeCaps,
  isoDate,
  formatTime,
  parseIso,
} from "../dates";
import { t } from "../i18n";
import {
  AxonMark,
  IconCal,
  IconCheck,
  IconDots,
  IconMic,
  IconPlus,
  IconSend,
  IconSpark,
} from "../icons";
import { useStore } from "../store";
import type { AICard, Category, PlanItem } from "../types";
import { DateStrip } from "../ui";

function Tag({ cat }: { cat: Category }) {
  const { data } = useStore();
  return <span className={"pill " + cat}>{t(data.lang, cat)}</span>;
}

function CardActions({
  card,
  onOpen,
  messageId,
}: {
  messageId: string;
  card: AICard;
  onOpen?: () => void;
}) {
  const { data, saveCard, convertTasks } = useStore();
  const lang = data.lang;
  const titles =
    card.tasks ||
    card.bullets?.map((b) => ({ title: b, category: "work" as Category })) ||
    [];
  return (
    <div className="card-actions">
      <button
        className="mini-btn dark press"
        onClick={() =>
          saveCard(card.type, card.title, card.summary || card.title, card)
        }
      >
        {t(lang, "save")}
      </button>
      {titles.length > 0 && (
        <button
          className="mini-btn press"
          onClick={() =>
            convertTasks(
              titles.map((item, i) => ({
                ...item,
                originId: messageId + "/" + i,
              })),
            )
          }
        >
          {t(lang, "convertTasks")}
        </button>
      )}
      {onOpen && (
        <button className="mini-btn press" onClick={onOpen}>
          {t(lang, "edit")}
        </button>
      )}
    </div>
  );
}

function AICardView({ card, messageId }: { card: AICard; messageId: string }) {
  const { data, openWeeklyFrom, saveCard, convertTasks } = useStore();
  const lang = data.lang;
  const plan = data.plans.find((p) => p.id === card.planId);
  const anchor =
    plan?.weekOf ||
    (plan ? isoDate(new Date(plan.generatedAt)) : data.selectedDate);
  const dayNum = parseIso(anchor).getDate();

  if (card.type === "weekly") {
    const items = plan?.items ?? [];
    const grouped = items.reduce<Record<string, PlanItem[]>>((acc, item) => {
      acc[item.day] = acc[item.day] || [];
      acc[item.day].push(item);
      return acc;
    }, {});
    return (
      <div className="ai-card">
        <button
          className="press"
          onClick={() => openWeeklyFrom(card.planId)}
          style={{
            width: "100%",
            textAlign: "left",
            background: "transparent",
          }}
        >
          <div className="row">
            <IconCal day={dayNum} size={22} />
            <div>
              <h4>{t(lang, "weeklySchedule")}</h4>
              <div className="section-label">{formatRangeCaps(anchor)}</div>
            </div>
          </div>
          {Object.entries(grouped)
            .slice(0, 2)
            .map(([day, dayItems]) => (
              <div key={day}>
                <div className="day-head">{day}</div>
                {dayItems.slice(0, 2).map((item) => (
                  <div className="plan-item" key={item.id}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 12, color: "var(--text-tertiary)" }}
                      >
                        {item.time}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {item.title}
                      </div>
                    </div>
                    <Tag cat={item.category} />
                  </div>
                ))}
              </div>
            ))}
        </button>
        <div className="card-actions">
          <button
            className="mini-btn dark press"
            onClick={() =>
              saveCard(
                "weekly",
                `${t(lang, "weeklyPlan")} · ${formatRange(anchor, lang)}`,
                items[0]?.title || card.title,
                { planId: card.planId },
              )
            }
          >
            {t(lang, "save")}
          </button>
          <button
            className="mini-btn press"
            onClick={() => plan && convertTasks(planTasks(plan))}
          >
            {t(lang, "convertTasks")}
          </button>
          <button
            className="mini-btn press"
            onClick={() => openWeeklyFrom(card.planId)}
          >
            {t(lang, "calendar")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-card">
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="pill ai">● {t(lang, "aiGenerated")}</span>
      </div>
      <h4>{card.title}</h4>
      {card.summary && (
        <p className="ai-text" style={{ marginTop: 8 }}>
          {card.summary}
        </p>
      )}
      {card.bullets && (
        <ul
          style={{
            marginTop: 10,
            paddingLeft: 18,
            color: "var(--text-primary)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {card.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {card.tasks &&
        card.tasks.map((task) => (
          <div className="plan-item" key={task.title}>
            <span className="checkbox">
              <IconCheck />
            </span>
            <div style={{ flex: 1 }}>{task.title}</div>
            <Tag cat={task.category} />
          </div>
        ))}
      <CardActions card={card} messageId={messageId} />
    </div>
  );
}

export function ChatScreen() {
  const {
    data,
    ui,
    setComposer,
    sendMessage,
    setMultimodalOpen,
    setOverlay,
    runMultimodal,
    cancel,
  } = useStore();
  const lang = data.lang;
  const [mode, setMode] = useState<"voice" | "image" | "link" | "document">(
    "voice",
  );

  return (
    <div className="screen">
      <header className="topbar">
        <div className="brand-row">
          <AxonMark size={40} />
          <div>
            <div className="brand-name">{t(lang, "axon")}</div>
            <div className="page-sub" style={{ marginTop: 2, fontSize: 12 }}>
              <span className="online-dot" />
              {ui.sync === "pending"
                ? lang === "zh"
                  ? "同步中"
                  : "Syncing"
                : ui.sync === "saved"
                  ? lang === "zh"
                    ? "已同步"
                    : "Synced"
                  : lang === "zh"
                    ? "待同步"
                    : "Not synced"}
            </div>
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => setOverlay({ name: "memory" })}
          aria-label={t(lang, "more")}
        >
          <IconDots />
        </button>
      </header>
      <div className="screen-body" style={{ paddingTop: 0 }}>
        <DateStrip />
        <div className="chat-thread" style={{ marginTop: 16 }}>
          {data.messages.length === 0 && !ui.typing && (
            <div className="empty" style={{ paddingTop: 32 }}>
              <h3>{t(lang, "emptyChat")}</h3>
              <p>{t(lang, "emptyChatHint")}</p>
              <button
                className="btn btn-primary"
                onClick={() => sendMessage(t(lang, "planWeekPrompt"))}
              >
                {t(lang, "planWeek")}
              </button>
            </div>
          )}
          {data.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="bubble-user">
                {m.text}
              </div>
            ) : (
              <div key={m.id} className="bubble-ai">
                <div className="ai-mark">
                  <IconSpark size={12} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ai-text">{m.text}</div>
                  {m.card && <AICardView card={m.card} messageId={m.id} />}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 6,
                    }}
                  >
                    {formatTime(m.createdAt, lang)}
                  </div>
                </div>
              </div>
            ),
          )}
          {ui.typing && (
            <div className="bubble-ai">
              <div className="ai-mark">
                <IconSpark size={12} />
              </div>
              <div>
                <div className="ai-text">
                  {ui.streamText || t(lang, "thinking")}{" "}
                  <button className="mini-btn" onClick={cancel}>
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={"composer-wrap" + (ui.multimodalOpen ? " open" : "")}>
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
        >
          <button
            type="button"
            className="icon-btn"
            aria-label="multimodal"
            onClick={() => setMultimodalOpen(!ui.multimodalOpen)}
          >
            <IconPlus />
          </button>
          <input
            value={ui.composer}
            placeholder={t(lang, "askPlaceholder")}
            onChange={(e) => setComposer(e.target.value)}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label={t(lang, "voice")}
            onClick={() => void runMultimodal("voice")}
          >
            <IconMic />
          </button>
          <button
            type="submit"
            disabled={ui.typing || ui.generating}
            className="send-btn press"
            aria-label={t(lang, "send")}
          >
            <IconSend />
          </button>
        </form>
        {ui.multimodalOpen && (
          <div className="mode-row">
            {(["voice", "image", "link", "document"] as const).map((m) => (
              <button
                key={m}
                className={"mode-chip press" + (mode === m ? " on" : "")}
                onClick={() => {
                  setMode(m);
                  if (m === "link") setOverlay({ name: "summarize" });
                  else void runMultimodal(m);
                }}
              >
                {t(lang, m)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
