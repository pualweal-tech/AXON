import type { Category, ChatMessage, Lang, WeeklyPlan } from "./types";
import { formatRange, isoDate, weekDates } from "./dates";
import { newId as nid } from "./data";

function id(prefix: string): string {
  return nid(prefix);
}

const WEEKDAY = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function weekdayName(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const i = d.getDay();
  return WEEKDAY[i === 0 ? 6 : i - 1];
}

export function buildWeeklyPlan(selectedDate: string, variant = 0): WeeklyPlan {
  const days = weekDates(selectedDate).slice(0, 5);
  const sets: { title: string; time?: string; category: Category }[][][] = [
    [
      [
        { title: "Design System—Finish token library", time: "9am", category: "work" },
        { title: "Gym · Push day (6pm)", time: "6pm", category: "health" },
      ],
      [
        { title: "Prep product review presentation", time: "10am", category: "work" },
        { title: "Read: Design Systems Handbook", time: "8pm", category: "study" },
      ],
      [
        { title: "Deep work — components", time: "9am", category: "work" },
        { title: "Gym · Pull day (6pm)", time: "6pm", category: "health" },
      ],
      [
        { title: "Product review (Thursday)", time: "2pm", category: "work" },
        { title: "Notes from critique", time: "5pm", category: "work" },
      ],
      [
        { title: "Ship weekly recap", time: "11am", category: "work" },
        { title: "Gym · Leg day (6pm)", time: "6pm", category: "health" },
      ],
    ],
    [
      [
        { title: "Morning focus — tokens & spacing", time: "9am", category: "work" },
        { title: "Walk / recovery (30m)", time: "6pm", category: "health" },
      ],
      [
        { title: "Critique rehearsal", time: "11am", category: "work" },
        { title: "Studio reading hour", time: "8pm", category: "study" },
      ],
      [
        { title: "Prototype interaction states", time: "9am", category: "work" },
        { title: "Gym · Upper body", time: "7am", category: "health" },
      ],
      [
        { title: "Product review — present & capture notes", time: "2pm", category: "work" },
        { title: "Light stretch", time: "6pm", category: "health" },
      ],
      [
        { title: "Close the week — save & convert", time: "10am", category: "work" },
        { title: "Gym · Lower body", time: "6pm", category: "health" },
      ],
    ],
  ];

  const pack = sets[variant % sets.length];
  const items = pack.flatMap((group, i) =>
    group.map((item) => ({
      ...item,
      id: id("pi"),
      day: weekdayName(days[i]),
    })),
  );

  return {
    id: id("plan"),
    variant,
    generatedAt: Date.now(),
    items,
  };
}

export function replyFor(text: string, lang: Lang, date: string, variant = 0): ChatMessage {
  const q = text.toLowerCase();
  const zh = lang === "zh";

  if (/week|plan my|schedule|周|规划/.test(q)) {
    const plan = buildWeeklyPlan(date, variant);
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "这是围绕你优先级排好的一周。工作块和恢复时间已经分开。"
        : "Here’s your weekly plan structured around your priorities. I’ve balanced work blocks with recovery time.",
      createdAt: Date.now(),
      card: {
        type: "weekly",
        title: zh ? "周计划" : "Weekly Schedule",
        planId: plan.id,
        meta: formatRange(date, lang),
      },
    };
  }

  if (/summar|总结|摘要/.test(q)) {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "我把要点收成一张摘要卡。需要的话可以保存，或转成任务。"
        : "I pulled the essentials into a summary card. You can save it or convert the actions.",
      createdAt: Date.now(),
      card: {
        type: "summary",
        title: zh ? "摘要" : "Summary",
        summary: zh
          ? "核心主张：把对话变成可执行结构。优先完成设计系统与周四评审，训练安排在清晨或傍晚以免打断深度工作。"
          : "Core claim: turn conversation into executable structure. Finish the design system ahead of Thursday’s review, and keep training in morning or evening blocks so deep work stays intact.",
        bullets: zh
          ? ["先锁定评审叙事", "tokens 必须在周三前完成", "训练 3 次，不占用深度工作"]
          : ["Lock the review narrative first", "Tokens need to land before Wednesday", "Train 3× without cutting deep work"],
      },
    };
  }

  if (/task|todo|任务/.test(q)) {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "我从你的目标里拆出一组可执行任务。"
        : "I turned your goals into a focused task list.",
      createdAt: Date.now(),
      card: {
        type: "tasks",
        title: zh ? "任务" : "Tasks",
        tasks: [
          { title: zh ? "完成设计系统 tokens" : "Finish design system tokens", category: "work" },
          { title: zh ? "准备产品评审演示" : "Prep product review presentation", category: "work" },
          { title: zh ? "力量训练 · 推" : "Gym · Push day", category: "health" },
        ],
      },
    };
  }

  if (/meeting|评审|会议|prepare/.test(q)) {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "周四评审的准备清单。按顺序做，会更从容。"
        : "A meeting prep checklist for Thursday’s review. Work it in order.",
      createdAt: Date.now(),
      card: {
        type: "meeting",
        title: zh ? "会议准备" : "Meeting prep",
        bullets: zh
          ? ["用 3 张卡片讲清 Think → Act 闭环", "准备 before/after 对比", "列出未解决问题", "预演 8 分钟"]
          : ["Tell the Think → Act loop in 3 cards", "Prepare a before/after comparison", "List open questions", "Rehearse an 8-minute pass"],
      },
    };
  }

  if (/trip|travel|行程|旅行/.test(q)) {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "一份紧凑的三天行程，节奏偏安静，适合带着作品集出差。"
        : "A compact three-day itinerary with a calm pace — built for a portfolio trip.",
      createdAt: Date.now(),
      card: {
        type: "trip",
        title: zh ? "行程" : "Trip plan",
        bullets: zh
          ? ["D1 抵达 / 工作室走访", "D2 展览与参考收集", "D3 回顾笔记并整理任务"]
          : ["D1 Arrive / studio visits", "D2 Exhibitions and reference gathering", "D3 Review notes and convert to tasks"],
      },
    };
  }

  if (/note|笔记/.test(q)) {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "我起草了一则笔记。可以编辑后再保存到工作区。"
        : "I drafted a note. Edit it, then save it to Workspace.",
      createdAt: Date.now(),
      card: {
        type: "note",
        title: zh ? "笔记草稿" : "Note draft",
        summary: zh
          ? "AXON 应当感觉像一个把想法变成行动的个人操作系统：先生成结构，再交给人审阅、转换和保存。"
          : "AXON should feel like a personal OS for turning thought into action: generate structure, then let the human review, convert, and save.",
      },
    };
  }

  return {
    id: id("m"),
    role: "assistant",
    text: zh
      ? "我记下了。需要的话我可以把它做成周计划、任务清单或摘要卡。"
      : "Noted. I can turn this into a weekly plan, a task list, or a summary card whenever you want.",
    createdAt: Date.now(),
    card: {
      type: "analysis",
      title: zh ? "下一步" : "Next step",
      bullets: zh
        ? ["生成一周计划", "拆成任务", "保存到工作区"]
        : ["Generate a weekly plan", "Break it into tasks", "Save it to Workspace"],
    },
  };
}

export function multimodalReply(
  mode: "voice" | "image" | "link" | "document",
  lang: Lang,
  extra?: string,
): ChatMessage {
  const zh = lang === "zh";
  if (mode === "voice") {
    return replyFor(zh ? "帮我规划这一周" : "Plan my week", lang, isoDate());
  }
  if (mode === "link") {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? `我阅读了 ${extra || "这个页面"}，并整理成摘要。`
        : `I read ${extra || "the page"} and pulled a structured summary.`,
      createdAt: Date.now(),
      card: {
        type: "summary",
        title: zh ? "页面摘要" : "Page summary",
        summary: zh
          ? "该页强调把 AI 输出做成可编辑的卡片，而不是长段文字。建议把生成结果保存，并转换为任务。"
          : "The page argues for editable AI cards over long prose. Save the output, then convert the actions into tasks.",
        bullets: zh
          ? ["结构化优先于装饰", "人始终可以编辑", "转换是产品闭环"]
          : ["Structure over decoration", "Humans stay in control", "Conversion is the product loop"],
        meta: extra,
      },
    };
  }
  if (mode === "image") {
    return {
      id: id("m"),
      role: "assistant",
      text: zh
        ? "我看过这张图。版面偏编辑感，建议继续用卡片而不是大插画。"
        : "I looked at the image. The layout is editorial — keep using cards, not large illustrations.",
      createdAt: Date.now(),
      card: {
        type: "analysis",
        title: zh ? "图像分析" : "Image analysis",
        bullets: zh
          ? ["浅色背景，深色主操作", "卡片半径 16–20", "导航保持四栏"]
          : ["Light surfaces, dark primary actions", "Card radius 16–20", "Keep the four-tab bar"],
      },
    };
  }
  return {
    id: id("m"),
    role: "assistant",
    text: zh
      ? "已读取 Brief.pdf。我提取了可执行要点。"
      : "Brief.pdf is in. I extracted the actionable points.",
    createdAt: Date.now(),
    card: {
      type: "note",
      title: zh ? "文档要点" : "Document notes",
      summary: zh
        ? "文档要求：保留 AXON 视觉语言，把静态屏变成可操作闭环，并用本地存储记住状态。"
        : "The brief: keep AXON’s visual language, make static screens an actionable loop, and persist state locally.",
    },
  };
}

export function attachPlan(message: ChatMessage, plan: WeeklyPlan): ChatMessage {
  return {
    ...message,
    card: { ...message.card!, planId: plan.id },
  };
}
