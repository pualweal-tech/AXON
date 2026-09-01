/* AXON — interactive mobile prototype (no build step) */
(() => {
  const KEY = "axon.v1";
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const iso = (d = new Date()) => {
    const x = d instanceof Date ? d : new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  const parseIso = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (s, n) => {
    const d = parseIso(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  const weekDates = (s) => {
    const d = parseIso(s);
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d);
      x.setDate(d.getDate() + i);
      return iso(x);
    });
  };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const weekdayName = (s) => {
    const i = parseIso(s).getDay();
    return DAYS[i === 0 ? 6 : i - 1];
  };
  const formatRange = (s, lang) => {
    const a = parseIso(weekDates(s)[0]);
    const b = parseIso(weekDates(s)[4]);
    if (lang === "zh") return `${a.getMonth() + 1}月${a.getDate()}日—${b.getMonth() + 1}月${b.getDate()}日`;
    const right = a.getMonth() === b.getMonth() ? `${b.getDate()}` : `${MONTHS[b.getMonth()]} ${b.getDate()}`;
    return `${MONTHS[a.getMonth()]} ${a.getDate()}—${right}`;
  };
  const formatRangeCaps = (s) => {
    const a = parseIso(weekDates(s)[0]);
    const b = parseIso(weekDates(s)[4]);
    const left = `${MONTHS[a.getMonth()].toUpperCase()} ${a.getDate()}`;
    const right = a.getMonth() === b.getMonth() ? `${b.getDate()}` : `${MONTHS[b.getMonth()].toUpperCase()} ${b.getDate()}`;
    return `${left} - ${right}`;
  };

  const en = {
    axon: "AXON", tagline: "A quiet intelligence that turns thoughts into actions.",
    online: "Online · Context Aware", continueEmail: "Continue with Email",
    continueGoogle: "Continue with Google", signUp: "Sign Up", logIn: "Log In",
    guest: "Continue as Guest", emailHint: "Use any email — this is a visual prototype.",
    chat: "Chat", actions: "Actions", workspace: "Workspace", profile: "Profile", memory: "Memory",
    askPlaceholder: "Ask anything or give a command...", send: "Send",
    voice: "Voice", image: "Image", link: "Link", document: "Document",
    weeklySchedule: "Weekly Schedule", weeklyPlan: "Weekly Plan",
    save: "Save", edit: "Edit", regenerate: "Regenerate", convertTasks: "Tasks", calendar: "Calendar",
    aiGenerated: "AI generated", thinking: "AXON is thinking",
    savedWorkspace: "Saved to Workspace", tasksCreated: "Tasks added to Workspace",
    planUpdated: "Plan updated", today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday",
    pickDate: "Date", actionsTitle: "Actions", actionsSub: "What should I do for you?",
    quickStart: "Quick start", askAnything: "Ask AXON anything", askAnythingSub: "Voice, text, or image input",
    planWeek: "Plan My Week", planWeekSub: "AI-generated schedule",
    writeNotes: "Write Notes", writeNotesSub: "Structured AI drafts",
    summarizePage: "Summarize Page", summarizePageSub: "Paste any URL",
    createTasks: "Create Tasks", createTasksSub: "From conversation",
    analyzeContent: "Analyze Content", analyzeContentSub: "Data & insights",
    planTrip: "Plan Trip", planTripSub: "Itinerary + hotels", generating: "Generating",
    notes: "Notes", tasks: "Tasks", saved: "Saved", categories: "Categories", items: "items", active: "active",
    noNotes: "No notes yet", noNotesHint: "Capture ideas, then convert them into actions.",
    createNote: "Create Note", noTasks: "No active tasks", noTasksHint: "Ask AXON to plan your week, then convert it.",
    addTask: "Add Task", noSaved: "No saved chats", noSavedHint: "Save an AI result to find it here.",
    startChat: "Start Chat", noteTitle: "Note title", noteBody: "Write your note…",
    delete: "Delete", done: "Done", add: "Add", taskPlaceholder: "New task",
    memorySub: "AXON learns your patterns", contextScore: "Context score", learning: "Learning",
    patternsStored: "patterns stored", updatedAgo: "Updated just now",
    whatRemembers: "What AXON remembers", workProjects: "Work & Projects",
    scheduleHabits: "Schedule & Habits", preferences: "Preferences",
    noMemories: "No memories yet", addMemory: "Add Memory", useMemory: "Allow AXON to use this",
    account: "Account", appearance: "Appearance", language: "Language",
    notifications: "Notifications", aiPrefs: "AI Preferences", about: "About", logOut: "Log out",
    signedIn: "Signed in locally", guestAccount: "Guest",
    themeSystem: "System", themeLight: "Light", themeDark: "Dark",
    fallbackNote: "This language currently uses English.",
    notifPush: "Push notifications", notifHints: "Action reminders",
    structuredCards: "Prefer structured cards", voiceReplies: "Voice-style replies",
    memoryAccess: "Use Memory as context",
    aboutBody: "AXON is a calm personal assistant that turns thoughts into plans, notes, and tasks.",
    version: "Version 1.0 prototype", pasteUrl: "Paste a URL", summarize: "Summarize",
    recording: "Listening…", analyzingImage: "Analyzing image…", analyzingDoc: "Reading document…",
    analyzingLink: "Summarizing page…", mockFile: "Brief.pdf selected",
    work: "Work", health: "Health", study: "Study", personal: "Personal",
    generated: "Generated", events: "events", chatWeekly: "Chat · Weekly Plan",
    emptyChat: "Think, then ask AXON.",
    emptyChatHint: "Plans, notes, tasks, and summaries appear as cards you can save or convert.",
    planWeekPrompt: "Plan my week", meetingPrompt: "Help me prepare for my meeting",
    close: "Close", search: "Search", more: "More",
  };
  const zh = {
    ...en,
    tagline: "安静的智能，把想法变成行动。", online: "在线 · 具备上下文",
    continueEmail: "使用邮箱继续", continueGoogle: "使用 Google 继续", signUp: "注册", logIn: "登录",
    guest: "以访客身份继续", emailHint: "任意邮箱即可 — 这是视觉原型。",
    chat: "对话", actions: "行动", workspace: "工作区", profile: "我的", memory: "记忆",
    askPlaceholder: "提问，或直接下达指令…", send: "发送", voice: "语音", image: "图片", link: "链接", document: "文档",
    weeklySchedule: "本周日程", weeklyPlan: "周计划", save: "保存", edit: "编辑", regenerate: "重新生成",
    convertTasks: "任务", calendar: "日历", aiGenerated: "AI 生成", thinking: "AXON 正在思考",
    savedWorkspace: "已保存到工作区", tasksCreated: "任务已加入工作区", planUpdated: "计划已更新",
    today: "今天", tomorrow: "明天", yesterday: "昨天", pickDate: "日期",
    actionsTitle: "行动", actionsSub: "需要我为你做什么？", quickStart: "快速开始",
    askAnything: "问 AXON 任何事", askAnythingSub: "语音、文字或图像输入",
    planWeek: "规划我的一周", planWeekSub: "AI 生成日程", writeNotes: "写笔记", writeNotesSub: "结构化草稿",
    summarizePage: "总结页面", summarizePageSub: "粘贴任意链接", createTasks: "创建任务",
    createTasksSub: "从对话生成", analyzeContent: "分析内容", analyzeContentSub: "数据与洞察",
    planTrip: "规划行程", planTripSub: "行程与住宿", generating: "正在生成",
    notes: "笔记", tasks: "任务", saved: "收藏", categories: "分类", items: "项", active: "进行中",
    noNotes: "还没有笔记", noNotesHint: "先记下想法，再把它们变成行动。", createNote: "新建笔记",
    noTasks: "没有进行中的任务", noTasksHint: "让 AXON 规划一周，再转换为任务。", addTask: "添加任务",
    noSaved: "没有已保存的对话", noSavedHint: "保存 AI 结果后会显示在这里。", startChat: "开始对话",
    noteTitle: "笔记标题", noteBody: "写下你的笔记…", delete: "删除", done: "完成", add: "添加",
    taskPlaceholder: "新任务", memorySub: "AXON 正在学习你的模式", contextScore: "上下文评分",
    learning: "学习中", patternsStored: "条已存储模式", updatedAgo: "刚刚更新",
    whatRemembers: "AXON 记住了什么", workProjects: "工作与项目", scheduleHabits: "日程与习惯",
    preferences: "偏好", noMemories: "还没有记忆", addMemory: "添加记忆", useMemory: "允许 AXON 使用这条记忆",
    account: "账户", appearance: "外观", language: "语言", notifications: "通知", aiPrefs: "AI 偏好",
    about: "关于", logOut: "退出登录", signedIn: "已在本地登录", guestAccount: "访客",
    themeSystem: "跟随系统", themeLight: "浅色", themeDark: "深色",
    fallbackNote: "该语言暂时使用英文界面。", notifPush: "推送通知", notifHints: "行动提醒",
    structuredCards: "偏好结构化卡片", voiceReplies: "语音风格回复", memoryAccess: "将记忆作为上下文",
    aboutBody: "AXON 是一款安静的个人助手，把想法变成计划、笔记和任务。", version: "1.0 原型版本",
    pasteUrl: "粘贴链接", summarize: "总结", recording: "正在聆听…", analyzingImage: "正在分析图片…",
    analyzingDoc: "正在阅读文档…", analyzingLink: "正在总结页面…", mockFile: "已选择 Brief.pdf",
    work: "工作", health: "健康", study: "学习", personal: "个人", generated: "已生成", events: "个事件",
    chatWeekly: "对话 · 周计划", emptyChat: "先思考，再问 AXON。",
    emptyChatHint: "计划、笔记、任务和摘要会以卡片呈现，可保存或转换。",
    planWeekPrompt: "帮我规划这一周", meetingPrompt: "帮我准备会议", close: "关闭", search: "搜索", more: "更多",
  };
  const t = (k) => (state.lang === "zh" ? zh[k] : en[k]) || en[k] || k;

  const PLAN_A = [
    [["Design System—Finish token library", "9am", "work"], ["Gym · Push day (6pm)", "6pm", "health"]],
    [["Prep product review presentation", "10am", "work"], ["Read: Design Systems Handbook", "8pm", "study"]],
    [["Deep work — components", "9am", "work"], ["Gym · Pull day (6pm)", "6pm", "health"]],
    [["Product review (Thursday)", "2pm", "work"], ["Notes from critique", "5pm", "work"]],
    [["Ship weekly recap", "11am", "work"], ["Gym · Leg day (6pm)", "6pm", "health"]],
  ];
  const PLAN_B = [
    [["Morning focus — tokens & spacing", "9am", "work"], ["Walk / recovery (30m)", "6pm", "health"]],
    [["Critique rehearsal", "11am", "work"], ["Studio reading hour", "8pm", "study"]],
    [["Prototype interaction states", "9am", "work"], ["Gym · Upper body", "7am", "health"]],
    [["Product review — present & capture notes", "2pm", "work"], ["Light stretch", "6pm", "health"]],
    [["Close the week — save & convert", "10am", "work"], ["Gym · Lower body", "6pm", "health"]],
  ];

  function buildPlan(date, variant = 0) {
    const days = weekDates(date).slice(0, 5);
    const pack = variant % 2 === 0 ? PLAN_A : PLAN_B;
    return {
      id: uid("plan"),
      variant,
      generatedAt: Date.now(),
      items: pack.flatMap((group, i) =>
        group.map(([title, time, category]) => ({
          id: uid("pi"),
          title,
          time,
          category,
          day: weekdayName(days[i]),
        })),
      ),
    };
  }

  function defaultData() {
    const today = iso();
    return {
      authenticated: false,
      theme: "system",
      lang: "en",
      selectedDate: today,
      tasks: [
        { id: "t1", title: "Finish design system tokens", done: false, category: "work", source: "manual", date: today },
        { id: "t2", title: "Prep product review slides", done: false, category: "work", source: "ai", date: addDays(today, 1) },
        { id: "t3", title: "Gym · Push day", done: true, category: "health", source: "ai", date: today },
      ],
      notes: [
        { id: "n1", title: "Design System Principles", body: "Clarity over decoration. AI output should be actionable.", source: "ai", updatedAt: Date.now() },
        { id: "n2", title: "Product Review Prep", body: "Show the loop: Think → Ask → Generate → Review → Convert → Save → Act.", source: "ai", updatedAt: Date.now() - 172000000 },
      ],
      saved: [],
      memories: [
        { id: "m1", category: "work", kind: "Role", text: "Visual communication design student, works on UI projects for portfolio.", enabled: true, confidence: 98 },
        { id: "m2", category: "preferences", kind: "Habit", text: "Prefers structured card outputs over plain prose answers.", enabled: true, confidence: 94 },
        { id: "m3", category: "schedule", kind: "Routine", text: "Gym 3× per week, prefers morning sessions.", enabled: true, confidence: 87 },
      ],
      messages: [],
      plans: [],
      prefs: { notifications: true, hapticStyle: true, structuredCards: true, memoryEnabled: true, voiceReplies: false },
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      return raw ? { ...defaultData(), ...raw, prefs: { ...defaultData().prefs, ...raw.prefs } } : defaultData();
    } catch {
      return defaultData();
    }
  }

  let data = load();
  const state = {
    screen: data.authenticated ? "main" : "splash",
    tab: "chat",
    overlay: { name: "none" },
    typing: false,
    generating: false,
    toast: "",
    composer: "",
    multimodal: false,
    mode: "voice",
    editingPlan: false,
    lang: data.lang,
    search: "",
  };

  function persist() {
    data.lang = state.lang;
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function resolvedTheme() {
    if (data.theme === "light") return "light";
    if (data.theme === "dark") return "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme() {
    const theme = resolvedTheme();
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#101014" : "#F8F8FA");
  }

  function toast(msg) {
    state.toast = msg;
    render();
    setTimeout(() => {
      state.toast = "";
      render();
    }, 1800);
  }

  function score() {
    const n = data.memories.filter((m) => m.enabled).length;
    return Math.min(99, 54 + n * 7 + (data.prefs.memoryEnabled ? 4 : 0));
  }

  function replyFor(text) {
    const q = text.toLowerCase();
    const zhLang = state.lang === "zh";
    if (/week|plan my|schedule|周|规划/.test(q)) {
      const plan = buildPlan(data.selectedDate, 0);
      data.plans.push(plan);
      return {
        id: uid("m"),
        role: "assistant",
        text: zhLang
          ? "这是围绕你优先级排好的一周。工作块和恢复时间已经分开。"
          : "Here’s your weekly plan structured around your priorities. I’ve balanced work blocks with recovery time.",
        createdAt: Date.now(),
        card: { type: "weekly", title: t("weeklySchedule"), planId: plan.id },
      };
    }
    if (/summar|总结|摘要/.test(q) || q.includes("http")) {
      return {
        id: uid("m"), role: "assistant", createdAt: Date.now(),
        text: zhLang ? "我把要点收成一张摘要卡。可以保存，或转成任务。" : "I pulled the essentials into a summary card. Save it or convert the actions.",
        card: { type: "summary", title: zhLang ? "摘要" : "Summary",
          summary: zhLang ? "核心主张：把对话变成可执行结构。优先完成设计系统与周四评审。" : "Core claim: turn conversation into executable structure. Finish the design system ahead of Thursday’s review.",
          bullets: zhLang ? ["先锁定评审叙事", "tokens 必须在周三前完成", "训练 3 次，不占用深度工作"] : ["Lock the review narrative first", "Tokens need to land before Wednesday", "Train 3× without cutting deep work"] },
      };
    }
    if (/task|todo|任务/.test(q)) {
      return {
        id: uid("m"), role: "assistant", createdAt: Date.now(),
        text: zhLang ? "我从你的目标里拆出一组可执行任务。" : "I turned your goals into a focused task list.",
        card: { type: "tasks", title: t("tasks"), tasks: [
          { title: zhLang ? "完成设计系统 tokens" : "Finish design system tokens", category: "work" },
          { title: zhLang ? "准备产品评审演示" : "Prep product review presentation", category: "work" },
          { title: zhLang ? "力量训练 · 推" : "Gym · Push day", category: "health" },
        ] },
      };
    }
    if (/meeting|评审|会议|prepare/.test(q)) {
      return {
        id: uid("m"), role: "assistant", createdAt: Date.now(),
        text: zhLang ? "周四评审的准备清单。按顺序做，会更从容。" : "A meeting prep checklist for Thursday’s review.",
        card: { type: "meeting", title: zhLang ? "会议准备" : "Meeting prep",
          bullets: zhLang ? ["用 3 张卡片讲清 Think → Act 闭环", "准备 before/after 对比", "列出未解决问题", "预演 8 分钟"] : ["Tell the Think → Act loop in 3 cards", "Prepare a before/after comparison", "List open questions", "Rehearse an 8-minute pass"] },
      };
    }
    if (/trip|travel|行程|旅行/.test(q)) {
      return {
        id: uid("m"), role: "assistant", createdAt: Date.now(),
        text: zhLang ? "一份紧凑的三天行程，节奏偏安静。" : "A compact three-day itinerary with a calm pace.",
        card: { type: "trip", title: zhLang ? "行程" : "Trip plan",
          bullets: zhLang ? ["D1 抵达 / 工作室走访", "D2 展览与参考收集", "D3 回顾笔记并整理任务"] : ["D1 Arrive / studio visits", "D2 Exhibitions and reference gathering", "D3 Review notes and convert to tasks"] },
      };
    }
    if (/note|笔记/.test(q)) {
      return {
        id: uid("m"), role: "assistant", createdAt: Date.now(),
        text: zhLang ? "我起草了一则笔记。可以编辑后再保存。" : "I drafted a note. Edit it, then save it to Workspace.",
        card: { type: "note", title: zhLang ? "笔记草稿" : "Note draft",
          summary: zhLang ? "AXON 应当感觉像一个把想法变成行动的个人操作系统。" : "AXON should feel like a personal OS for turning thought into action." },
      };
    }
    return {
      id: uid("m"), role: "assistant", createdAt: Date.now(),
      text: zhLang ? "我记下了。需要的话我可以把它做成周计划、任务清单或摘要卡。" : "Noted. I can turn this into a weekly plan, a task list, or a summary card whenever you want.",
      card: { type: "analysis", title: zhLang ? "下一步" : "Next step",
        bullets: zhLang ? ["生成一周计划", "拆成任务", "保存到工作区"] : ["Generate a weekly plan", "Break it into tasks", "Save it to Workspace"] },
    };
  }

  const I = {
    spark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 13.7 9 19.5 10.8 13.7 12.6 12 18.4 10.3 12.6 4.5 10.8 10.3 9 12 3.2Z"/></svg>`,
    plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>`,
    mic: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="4" width="6" height="10" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3"/></svg>`,
    send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M6.5 11 12 5l5.5 6"/></svg>`,
    dots: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>`,
    back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5 8 12l7 7"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="m16.5 16.5 3 3"/></svg>`,
    bolt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFD60A"><path d="M13.2 3 6.4 13.1h4.3L9.6 21l8.4-11.4h-4.6L13.2 3Z"/></svg>`,
    folder: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3.5 8.5V7A2 2 0 0 1 5.5 5h3.2l1.6 2H18.5A2 2 0 0 1 20.5 9v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8.5Z"/></svg>`,
    person: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#4C8DFF"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 18.5c1.2-3.1 3.5-4.6 6.5-4.6s5.3 1.5 6.5 4.6"/></svg>`,
    chat: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4.2 3.2A.8.8 0 0 1 4.5 18.6V6.5Z"/><circle cx="9" cy="10.5" r="1" fill="currentColor"/><circle cx="12" cy="10.5" r="1" fill="currentColor"/><circle cx="15" cy="10.5" r="1" fill="currentColor"/></svg>`,
    chevron: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 6 6 6-6 6"/></svg>`,
    regen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4.5V9h-4.5"/></svg>`,
    mark: `<svg width="40" height="40" viewBox="0 0 48 48"><defs><linearGradient id="axonRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2E5BFF"/><stop offset="100%" stop-color="#7E3FF2"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="#0F1117"/><circle cx="24" cy="24" r="11.5" fill="none" stroke="url(#axonRing)" stroke-width="5"/><circle cx="24" cy="24" r="6" fill="#fff"/></svg>`,
  };

  function logo(size = 40) {
    return `<img src="../assets/logo.png" alt="AXON" width="${size}" height="${size}" style="border-radius:${Math.round(size * 0.28)}px;object-fit:cover" onerror="this.outerHTML=\`${I.mark}\`"/>`;
  }

  function pill(cat, label) {
    return `<span class="pill ${cat}">${esc(label || t(cat))}</span>`;
  }

  function dateStrip() {
    const today = iso();
    const chips = [
      [addDays(today, -1), t("yesterday")],
      [today, t("today")],
      [addDays(today, 1), t("tomorrow")],
    ];
    return `<div class="date-row">${chips
      .map(
        ([id, label]) =>
          `<button class="date-chip press${data.selectedDate === id ? " active" : ""}" data-act="date" data-date="${id}">${esc(label)}</button>`,
      )
      .join("")}<label class="date-chip">${t("pickDate")}<input type="date" value="${data.selectedDate}" data-act="date-input" style="position:absolute;opacity:0;inset:0;width:100%;height:100%;cursor:pointer"/></label></div>`;
  }

  function nav() {
    const items = [
      ["chat", t("chat"), I.chat, "#7B61FF"],
      ["actions", t("actions"), I.bolt, "#FFD60A"],
      ["workspace", t("workspace"), I.folder, "#8A8A94"],
      ["profile", t("profile"), I.person, "#4C8DFF"],
    ];
    return `<nav class="nav">${items
      .map(([id, label, icon, color]) => {
        const on = state.tab === id && !["weekly-plan", "memory"].includes(state.overlay.name);
        const c = on ? (id === "actions" ? "#FFD60A" : "#fff") : color;
        return `<button class="nav-item press${on ? " active" : ""}" data-act="tab" data-tab="${id}"><span class="nav-icon" style="color:${c}">${icon}</span>${esc(label)}</button>`;
      })
      .join("")}</nav>`;
  }

  function splash() {
    return `<div class="splash${state.leaving ? " leaving" : ""}"><img src="../assets/logo.png" alt="AXON" class="splash-logo" onerror="this.style.display='none'"/></div>`;
  }

  function auth() {
    return `<div class="auth">${logo(64)}<h1>${t("axon")}</h1><p class="page-sub">${t("tagline")}</p>
      <div style="margin-top:auto;display:grid;gap:12px;padding-top:48px">
        <p style="color:var(--text-tertiary);font-size:13px">${t("emailHint")}</p>
        <button class="btn btn-primary btn-block" data-act="login">${t("continueEmail")}</button>
        <button class="btn btn-secondary btn-block" data-act="login">${t("continueGoogle")}</button>
        <button class="btn btn-secondary btn-block" data-act="login">${t("signUp")}</button>
        <button class="btn btn-ghost btn-block" data-act="login">${t("logIn")}</button>
        <button class="btn btn-ghost btn-block" data-act="login">${t("guest")}</button>
      </div></div>`;
  }

  function cardView(card) {
    if (!card) return "";
    if (card.type === "weekly") {
      const plan = data.plans.find((p) => p.id === card.planId);
      const items = plan?.items || [];
      const grouped = {};
      items.forEach((it) => {
        grouped[it.day] = grouped[it.day] || [];
        grouped[it.day].push(it);
      });
      const days = Object.entries(grouped).slice(0, 2);
      return `<div class="ai-card">
        <button class="press" data-act="open-plan" data-id="${card.planId}" style="width:100%;text-align:left;background:transparent">
          <div class="row">${I.spark}<div><h4>${t("weeklySchedule")}</h4><div class="section-label">${formatRangeCaps(data.selectedDate)}</div></div></div>
          ${days
            .map(
              ([day, its]) =>
                `<div class="day-head">${day}</div>${its
                  .slice(0, 2)
                  .map(
                    (it) =>
                      `<div class="plan-item"><span class="dot ${it.category === "work" ? "" : it.category}"></span><div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--text-tertiary)">${esc(it.time)}</div><div style="font-size:14px;font-weight:600">${esc(it.title)}</div></div>${pill(it.category)}</div>`,
                  )
                  .join("")}`,
            )
            .join("")}
        </button>
        <div class="card-actions">
          <button class="mini-btn dark press" data-act="save-plan" data-id="${card.planId}">${t("save")}</button>
          <button class="mini-btn press" data-act="convert-plan" data-id="${card.planId}">${t("convertTasks")}</button>
          <button class="mini-btn press" data-act="open-plan" data-id="${card.planId}">${t("calendar")}</button>
        </div>
      </div>`;
    }
    const bullets = (card.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("");
    const tasks = (card.tasks || [])
      .map((tk) => `<div class="plan-item"><span class="checkbox"></span><div style="flex:1">${esc(tk.title)}</div>${pill(tk.category)}</div>`)
      .join("");
    return `<div class="ai-card"><span class="pill ai">● ${t("aiGenerated")}</span><h4 style="margin-top:8px">${esc(card.title)}</h4>
      ${card.summary ? `<p class="ai-text" style="margin-top:8px">${esc(card.summary)}</p>` : ""}
      ${bullets ? `<ul style="margin-top:10px;padding-left:18px;font-size:14px;line-height:1.6">${bullets}</ul>` : ""}
      ${tasks}
      <div class="card-actions">
        <button class="mini-btn dark press" data-act="save-card" data-title="${esc(card.title)}">${t("save")}</button>
        ${card.tasks || card.bullets ? `<button class="mini-btn press" data-act="convert-card" data-title="${esc(card.title)}">${t("convertTasks")}</button>` : ""}
      </div></div>`;
  }

  function chat() {
    const msgs = data.messages
      .map((m) =>
        m.role === "user"
          ? `<div class="bubble-user">${esc(m.text)}</div>`
          : `<div class="bubble-ai"><div class="ai-mark">${I.spark}</div><div style="flex:1;min-width:0"><div class="ai-text">${esc(m.text)}</div>${cardView(m.card)}</div></div>`,
      )
      .join("");
    const empty =
      !data.messages.length && !state.typing
        ? `<div class="empty" style="padding-top:32px"><h3>${t("emptyChat")}</h3><p>${t("emptyChatHint")}</p><button class="btn btn-primary" data-act="send-text" data-text="${esc(t("planWeekPrompt"))}">${t("planWeek")}</button></div>`
        : "";
    const typing = state.typing
      ? `<div class="bubble-ai"><div class="ai-mark">${I.spark}</div><div><div class="ai-text">${t("thinking")}</div><div class="typing"><span></span><span></span><span></span></div></div></div>`
      : "";
    const modes = ["voice", "image", "link", "document"]
      .map((m) => `<button class="mode-chip press${state.mode === m ? " on" : ""}" data-act="mode" data-mode="${m}">${t(m)}</button>`)
      .join("");
    return `<div class="screen">
      <header class="topbar"><div class="brand-row">${logo(40)}<div><div class="brand-name">${t("axon")}</div><div class="page-sub" style="margin-top:2px;font-size:12px"><span class="online-dot"></span>${t("online")}</div></div></div>
        <button class="icon-btn" data-act="overlay" data-name="memory">${I.dots}</button></header>
      <div class="screen-body" style="padding-top:0">${dateStrip()}<div class="chat-thread" style="margin-top:16px">${empty}${msgs}${typing}</div></div>
      <div class="composer-wrap${state.multimodal ? " open" : ""}">
        <form class="composer" data-act="send-form">
          <button type="button" class="icon-btn" data-act="toggle-mm">${I.plus}</button>
          <input id="composer" value="${esc(state.composer)}" placeholder="${esc(t("askPlaceholder"))}"/>
          <button type="button" class="icon-btn" data-act="mode" data-mode="voice">${I.mic}</button>
          <button type="submit" class="send-btn press">${I.send}</button>
        </form>
        ${state.multimodal ? `<div class="mode-row">${modes}</div>` : ""}
      </div></div>`;
  }

  function actions() {
    const cards = [
      ["week", t("planWeek"), t("planWeekSub"), "open-week"],
      ["notes", t("writeNotes"), t("writeNotesSub"), "note"],
      ["sum", t("summarizePage"), t("summarizePageSub"), "summarize"],
      ["tasks", t("createTasks"), t("createTasksSub"), "tasks"],
      ["analyze", t("analyzeContent"), t("analyzeContentSub"), "analyze"],
      ["trip", t("planTrip"), t("planTripSub"), "trip"],
    ];
    return `<div class="screen"><header class="topbar" style="flex-direction:column;align-items:stretch"><div class="page-title">${t("actionsTitle")}</div><div class="page-sub">${t("actionsSub")}</div></header>
      <div class="screen-body"><div class="section-label" style="margin-bottom:12px">${t("quickStart")}</div>
      <button class="ask-card press" data-act="tab" data-tab="chat"><span class="icon-tile" style="background:#2a2a36;color:#fff">${I.spark}</span><span style="flex:1"><b>${t("askAnything")}</b><small>${t("askAnythingSub")}</small></span>${I.chevron}</button>
      <div class="action-grid" style="margin-top:16px">${cards
        .map(
          ([id, title, sub, act]) =>
            `<button class="action-card press" data-act="${act}"><span class="icon-tile">${I.spark}</span><h3>${esc(title)}</h3><p>${esc(sub)}</p></button>`,
        )
        .join("")}</div></div></div>`;
  }

  function workspace() {
    const q = state.search.toLowerCase();
    const notes = data.notes.filter((n) => n.title.toLowerCase().includes(q));
    const tasks = data.tasks.filter((n) => n.title.toLowerCase().includes(q));
    const saved = data.saved.filter((n) => n.title.toLowerCase().includes(q));
    return `<div class="screen"><header class="topbar"><div class="page-title">${t("workspace")}</div><button class="icon-btn" data-act="toggle-search">${I.search}</button></header>
      <div class="screen-body" style="padding-top:0">
      ${state.showSearch ? `<input class="field" style="margin-bottom:16px" placeholder="${t("search")}" value="${esc(state.search)}" data-act="search"/>` : ""}
      ${dateStrip()}
      <div class="stats" style="margin-top:16px">
        <button class="stat press" data-act="overlay" data-name="notes"><b>${data.notes.length}</b><span>${t("notes")}</span></button>
        <button class="stat press" data-act="overlay" data-name="tasks"><b>${data.tasks.length}</b><span>${t("tasks")}</span></button>
        <button class="stat press" data-act="overlay" data-name="saved"><b>${data.saved.length}</b><span>${t("saved")}</span></button>
      </div>
      <div class="section-label" style="margin:24px 0 4px">${t("categories")}</div>
      <section class="group"><button class="group-head press" style="width:100%" data-act="overlay" data-name="notes"><span class="row"><b>${t("notes")}</b></span><span class="pill manual">${notes.length} ${t("items")}</span></button>
        ${notes.length ? notes.slice(0, 3).map((n) => `<button class="list-row press" data-act="edit-note" data-id="${n.id}">${I.spark}<span style="flex:1;font-weight:600">${esc(n.title)}</span><span class="pill ai">AI</span></button>`).join("") : `<div class="empty"><h3>${t("noNotes")}</h3><p>${t("noNotesHint")}</p><button class="btn btn-primary" data-act="overlay" data-name="note">${t("createNote")}</button></div>`}
      </section>
      <section class="group"><button class="group-head press" style="width:100%" data-act="overlay" data-name="tasks"><span class="row"><b>${t("tasks")}</b></span><span class="pill manual">${tasks.filter((x) => !x.done).length} ${t("active")}</span></button>
        ${tasks.slice(0, 4).map((tk) => `<button class="list-row press" data-act="toggle-task" data-id="${tk.id}"><span class="checkbox${tk.done ? " on" : ""}">${tk.done ? "✓" : ""}</span><span class="${tk.done ? "task-done" : ""}" style="flex:1;font-weight:600">${esc(tk.title)}</span>${pill(tk.category)}</button>`).join("")}
      </section>
      <section class="group"><button class="group-head press" style="width:100%" data-act="overlay" data-name="saved"><span class="row"><b>${t("saved")}</b></span><span class="pill manual">${saved.length}</span></button>
        ${saved.length ? saved.map((s) => `<button class="list-row press" data-act="open-saved" data-id="${s.id}"><span style="flex:1;font-weight:600">${esc(s.title)}</span><span class="pill ai">AI</span></button>`).join("") : `<div class="empty"><h3>${t("noSaved")}</h3><p>${t("noSavedHint")}</p><button class="btn btn-primary" data-act="tab" data-tab="chat">${t("startChat")}</button></div>`}
      </section></div></div>`;
  }

  function weeklyPlan(planId) {
    const plan = data.plans.find((p) => p.id === planId);
    if (!plan) return `<div class="screen"><header class="topbar"><button class="icon-btn" data-act="close">${I.back}</button></header></div>`;
    const grouped = {};
    plan.items.forEach((it) => {
      grouped[it.day] = grouped[it.day] || [];
      grouped[it.day].push(it);
    });
    const events = plan.items.filter((i) => i.category === "health").length;
    const body = state.generating
      ? `<div class="skeleton" style="height:64px;margin-bottom:8px"></div><div class="skeleton" style="height:64px;margin-bottom:8px"></div><div class="skeleton" style="height:64px"></div>`
      : Object.entries(grouped)
          .map(
            ([day, items]) =>
              `<div class="day-head">${day}</div>${items
                .map(
                  (it) =>
                    `<div class="week-item"><span class="dot ${it.category === "work" ? "" : it.category}"></span>${
                      state.editingPlan
                        ? `<input data-act="edit-item" data-plan="${plan.id}" data-id="${it.id}" value="${esc(it.title)}"/>`
                        : `<div style="flex:1;font-weight:600">${esc(it.title)}</div>`
                    }${pill(it.category)}</div>`,
                )
                .join("")}`,
          )
          .join("");
    return `<div class="screen"><header class="topbar" style="align-items:center">
      <button class="icon-btn" data-act="close">${I.back}</button>
      <div style="flex:1;text-align:center;color:var(--text-secondary);font-weight:500">${t("chatWeekly")}</div>
      <button class="icon-btn">${I.dots}</button></header>
      <div class="screen-body" style="padding-bottom:140px">
        <span class="pill ai">● ${t("aiGenerated").toUpperCase()}</span>
        <h1 class="page-title" style="margin-top:12px">${t("weeklyPlan")}</h1>
        <h2 class="page-title" style="font-size:24px">${formatRange(data.selectedDate, state.lang)}</h2>
        <p class="page-sub">${t("generated")} · ${plan.items.length} ${t("tasks").toLowerCase()} · ${events} ${t("events")}</p>
        <div style="margin:16px 0">${dateStrip()}</div>
        ${body}
      </div>
      <div class="plan-toolbar">
        <button class="btn btn-primary press" data-act="save-plan" data-id="${plan.id}">${t("save")}</button>
        <button class="btn btn-secondary press" data-act="convert-plan" data-id="${plan.id}" style="color:var(--tag-work);background:var(--tag-work-soft)">→ ${t("convertTasks")}</button>
        <button class="btn btn-secondary press" data-act="toggle-edit">${state.editingPlan ? t("done") : t("edit")}</button>
        <button class="btn btn-secondary press" data-act="regen" data-id="${plan.id}">${I.regen}</button>
      </div></div>`;
  }

  function memory() {
    const sc = score();
    const groups = {
      work: data.memories.filter((m) => m.category === "work"),
      schedule: data.memories.filter((m) => m.category === "schedule"),
      preferences: data.memories.filter((m) => m.category === "preferences"),
    };
    const block = (title, items) =>
      `<section class="card" style="margin-bottom:12px"><div class="row space-between" style="margin-bottom:12px"><b>${esc(title)}</b><span style="color:var(--text-tertiary);font-size:13px">${items.length} ${t("items")}</span></div>
      ${items
        .map(
          (m) =>
            `<div class="card" style="margin-bottom:8px;background:var(--surface-secondary);border:0;opacity:${m.enabled ? 1 : 0.55}">
              <div class="row space-between"><span class="section-label">${esc(m.kind)}</span><span class="pill success">${m.confidence}%</span></div>
              <p style="margin-top:8px;font-size:14px;line-height:1.45">${esc(m.text)}</p>
              <div class="row space-between" style="margin-top:12px">
                <button class="switch${m.enabled ? " on" : ""}" data-act="toggle-mem" data-id="${m.id}"></button>
                <button class="mini-btn" data-act="del-mem" data-id="${m.id}">${t("delete")}</button>
              </div></div>`,
        )
        .join("")}</section>`;
    return `<div class="screen"><header class="topbar" style="align-items:center"><button class="icon-btn" data-act="close">${I.back}</button><div style="flex:1"><div class="page-title">${t("memory")}</div><div class="page-sub">${t("memorySub")}</div></div></header>
      <div class="screen-body"><div class="score-card">
        <div class="row space-between"><span class="section-label" style="color:#a5a5ae">${t("contextScore")}</span><span class="pill" style="background:#2a2a36;color:#9aa4ff">${t("learning")}</span></div>
        <div style="font-size:48px;font-weight:700;letter-spacing:-0.04em;margin-top:8px">${sc}<span style="font-size:24px">%</span></div>
        <div class="bar"><span style="width:${sc}%"></span></div>
        <div class="row space-between" style="color:#a5a5ae;font-size:12px"><span>${data.memories.length} ${t("patternsStored")}</span><span>${t("updatedAgo")}</span></div>
      </div>
      <div class="section-label" style="margin:24px 0 12px">${t("whatRemembers")}</div>
      ${groups.work.length ? block(t("workProjects"), groups.work) : ""}
      ${groups.schedule.length ? block(t("scheduleHabits"), groups.schedule) : ""}
      ${groups.preferences.length ? block(t("preferences"), groups.preferences) : ""}
      <div class="card"><b>${t("addMemory")}</b>
        <textarea class="field field-area" style="margin:12px 0" data-act="mem-draft" placeholder="${esc(t("noteBody"))}">${esc(state.memDraft || "")}</textarea>
        <button class="btn btn-primary btn-block" data-act="add-mem">${t("add")}</button>
      </div></div></div>`;
  }

  function profile() {
    const rows = [
      [t("appearance"), "appearance"],
      [t("language"), "language"],
      [t("notifications"), "notifications"],
      [t("aiPrefs"), "ai-prefs"],
      [t("memory"), "memory"],
      [t("about"), "about"],
    ];
    return `<div class="screen"><header class="topbar"><div class="page-title">${t("profile")}</div></header>
      <div class="screen-body"><button class="card press" style="width:100%;text-align:left" data-act="overlay" data-name="account"><div class="row">${logo(48)}<div><b>${t("axon")}</b><div class="page-sub">${t("signedIn")}</div></div></div></button>
      <div class="card" style="margin-top:16px;padding:4px 16px">${rows
        .map(([label, name]) => `<button class="setting-row press" data-act="overlay" data-name="${name}"><span>${esc(label)}</span>${I.chevron}</button>`)
        .join("")}</div>
      <button class="btn btn-secondary btn-block" style="margin-top:24px" data-act="logout">${t("logOut")}</button></div></div>`;
  }

  function sheet(inner) {
    return `<div class="overlay" data-act="close"><div class="sheet" data-stop="1"><div class="sheet-handle"></div>${inner}</div></div>`;
  }

  function overlays() {
    const o = state.overlay;
    if (o.name === "none" || o.name === "weekly-plan" || o.name === "memory") return "";
    if (o.name === "note" || o.name === "notes") {
      const note = data.notes.find((n) => n.id === o.id);
      return sheet(`<h2>${t("notes")}</h2>
        ${data.notes.map((n) => `<button class="list-row press" data-act="edit-note" data-id="${n.id}"><span style="flex:1;font-weight:600">${esc(n.title)}</span></button>`).join("")}
        <input class="field" style="margin-top:16px" data-act="note-title" placeholder="${esc(t("noteTitle"))}" value="${esc(note?.title || state.noteTitle || "")}"/>
        <textarea class="field field-area" style="margin-top:12px" data-act="note-body" placeholder="${esc(t("noteBody"))}">${esc(note?.body || state.noteBody || "")}</textarea>
        <button class="btn btn-primary btn-block" style="margin-top:16px" data-act="save-note" data-id="${note?.id || ""}">${t("save")}</button>
        ${note ? `<button class="btn btn-ghost btn-block" data-act="del-note" data-id="${note.id}">${t("delete")}</button>` : ""}`);
    }
    if (o.name === "tasks" || o.name === "create-task") {
      return sheet(`<h2>${t("tasks")}</h2>
        <form class="row" style="margin:16px 0" data-act="add-task-form"><input class="field" data-act="task-title" placeholder="${esc(t("taskPlaceholder"))}"/><button class="btn btn-primary" type="submit">${t("add")}</button></form>
        ${data.tasks
          .map(
            (tk) =>
              `<div class="list-row"><button class="checkbox${tk.done ? " on" : ""}" data-act="toggle-task" data-id="${tk.id}">${tk.done ? "✓" : ""}</button><span class="${tk.done ? "task-done" : ""}" style="flex:1">${esc(tk.title)}</span>${pill(tk.category)}<button class="mini-btn" data-act="del-task" data-id="${tk.id}">${t("delete")}</button></div>`,
          )
          .join("")}`);
    }
    if (o.name === "saved") {
      const item = data.saved.find((s) => s.id === o.id);
      return sheet(`<h2>${t("saved")}</h2>${
        item
          ? `<div class="card" style="margin-top:16px"><span class="pill ai">AI</span><h3 style="margin-top:8px">${esc(item.title)}</h3><p class="page-sub">${esc(item.preview)}</p></div>`
          : data.saved.map((s) => `<button class="list-row press" data-act="open-saved" data-id="${s.id}"><span style="flex:1;font-weight:600">${esc(s.title)}</span></button>`).join("") || `<p class="page-sub">${t("noSavedHint")}</p>`
      }`);
    }
    if (o.name === "summarize") {
      return sheet(`<h2>${t("summarizePage")}</h2><input class="field" style="margin-top:16px" data-act="url" value="${esc(state.url || "https://")}" placeholder="${esc(t("pasteUrl"))}"/>
        <button class="btn btn-primary btn-block" style="margin-top:16px" data-act="do-link">${t("summarize")}</button>`);
    }
    if (o.name === "multimodal") {
      const labels = { voice: t("recording"), image: t("analyzingImage"), link: t("analyzingLink"), document: t("analyzingDoc") };
      return sheet(`<div style="text-align:center;padding:32px"><div class="spinner" style="margin:0 auto 16px"></div><h3>${labels[o.mode || "voice"]}</h3></div>`);
    }
    if (o.name === "appearance") {
      return sheet(`<h2>${t("appearance")}</h2>${["system", "light", "dark"]
        .map((m, i) => `<button class="setting-row press" data-act="theme" data-theme="${m}"><span>${[t("themeSystem"), t("themeLight"), t("themeDark")][i]}</span>${data.theme === m ? `<span class="pill ai">${t("done")}</span>` : ""}</button>`)
        .join("")}`);
    }
    if (o.name === "language") {
      const langs = [
        ["en", "English", true],
        ["zh", "中文", true],
        ["ja", "日本語", false],
        ["ko", "한국어", false],
        ["de", "Deutsch", false],
        ["fr", "Français", false],
        ["es", "Español", false],
      ];
      return sheet(`<h2>${t("language")}</h2>${langs
        .map(
          ([id, label, native]) =>
            `<button class="setting-row press" data-act="lang" data-lang="${id}"><span>${label}${native ? "" : `<div class="page-sub">${t("fallbackNote")}</div>`}</span>${state.lang === id || (state.lang !== "zh" && state.lang !== "en" && id === "en" && !["zh"].includes(state.lang) && state.lang === id) ? (state.lang === id ? `<span class="pill ai">${t("done")}</span>` : "") : state.lang === id ? `<span class="pill ai">${t("done")}</span>` : ""}</button>`,
        )
        .join("")}`);
    }
    if (o.name === "notifications") {
      return sheet(`<h2>${t("notifications")}</h2><div class="setting-row"><span>${t("notifPush")}</span><button class="switch${data.prefs.notifications ? " on" : ""}" data-act="pref" data-key="notifications"></button></div>
        <div class="setting-row"><span>${t("notifHints")}</span><button class="switch${data.prefs.hapticStyle ? " on" : ""}" data-act="pref" data-key="hapticStyle"></button></div>`);
    }
    if (o.name === "ai-prefs") {
      return sheet(`<h2>${t("aiPrefs")}</h2>
        <div class="setting-row"><span>${t("structuredCards")}</span><button class="switch${data.prefs.structuredCards ? " on" : ""}" data-act="pref" data-key="structuredCards"></button></div>
        <div class="setting-row"><span>${t("voiceReplies")}</span><button class="switch${data.prefs.voiceReplies ? " on" : ""}" data-act="pref" data-key="voiceReplies"></button></div>
        <div class="setting-row"><span>${t("memoryAccess")}</span><button class="switch${data.prefs.memoryEnabled ? " on" : ""}" data-act="pref" data-key="memoryEnabled"></button></div>`);
    }
    if (o.name === "about") return sheet(`<h2>${t("about")}</h2><p class="page-sub" style="margin-top:12px">${t("aboutBody")}</p><p class="page-sub">${t("version")}</p>`);
    if (o.name === "account") return sheet(`<h2>${t("account")}</h2><p class="page-sub" style="margin-top:12px">${t("guestAccount")}</p><p class="page-sub">${t("signedIn")}</p>`);
    return "";
  }

  function send(text) {
    const content = (text ?? state.composer).trim();
    if (!content) return;
    data.messages.push({ id: uid("m"), role: "user", text: content, createdAt: Date.now() });
    state.composer = "";
    state.typing = true;
    state.multimodal = false;
    state.tab = "chat";
    state.overlay = { name: "none" };
    persist();
    render();
    setTimeout(() => {
      data.messages.push(replyFor(content));
      state.typing = false;
      persist();
      render();
    }, 1300);
  }

  function convertPlan(id) {
    const plan = data.plans.find((p) => p.id === id);
    if (!plan) return;
    plan.items.forEach((it) => {
      data.tasks.unshift({ id: uid("t"), title: it.title, done: false, category: it.category, source: "ai", date: data.selectedDate });
    });
    persist();
    toast(t("tasksCreated"));
  }

  function savePlan(id) {
    const plan = data.plans.find((p) => p.id === id);
    data.saved.unshift({
      id: uid("s"),
      title: `${t("weeklyPlan")} · ${formatRange(data.selectedDate, state.lang)}`,
      kind: "weekly",
      preview: plan?.items[0]?.title || "",
      payload: { planId: id },
      createdAt: Date.now(),
    });
    persist();
    toast(t("savedWorkspace"));
  }

  function runMode(mode, extra) {
    state.overlay = { name: "multimodal", mode };
    state.generating = true;
    state.tab = "chat";
    render();
    setTimeout(() => {
      const text =
        mode === "voice"
          ? t("planWeekPrompt")
          : mode === "link"
            ? extra || "https://example.com"
            : mode === "image"
              ? "analyze this image"
              : "summarize this document";
      data.messages.push(replyFor(text));
      state.generating = false;
      state.overlay = { name: "none" };
      state.multimodal = false;
      persist();
      render();
    }, 1400);
  }

  function render() {
    applyTheme();
    const root = document.getElementById("app");
    if (state.screen === "splash") {
      root.innerHTML = splash();
      return;
    }
    if (state.screen === "auth") {
      root.innerHTML = auth();
      return;
    }
    let main = chat();
    if (state.overlay.name === "weekly-plan") main = weeklyPlan(state.overlay.planId);
    else if (state.overlay.name === "memory") main = memory();
    else if (state.tab === "actions") main = actions();
    else if (state.tab === "workspace") main = workspace();
    else if (state.tab === "profile") main = profile();
    root.innerHTML =
      main +
      nav() +
      overlays() +
      (state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "") +
      (state.generating && state.overlay.name !== "weekly-plan" && state.overlay.name !== "multimodal"
        ? `<div class="overlay" style="align-items:center;justify-content:center"><div class="card" style="margin:24px;text-align:center"><div class="spinner" style="margin:0 auto 12px"></div>${t("generating")}</div></div>`
        : "");
    const input = $("#composer");
    if (input) {
      input.value = state.composer;
      input.addEventListener("input", (e) => {
        state.composer = e.target.value;
      });
    }
  }

  document.getElementById("app").addEventListener("click", (e) => {
    const stop = e.target.closest("[data-stop]");
    const btn = e.target.closest("[data-act]");
    if (e.target.classList.contains("overlay") && e.currentTarget.contains(e.target)) {
      if (state.overlay.name !== "weekly-plan" && state.overlay.name !== "memory") {
        state.overlay = { name: "none" };
        render();
      }
      return;
    }
    if (!btn) return;
    if (stop && btn.closest(".sheet") && e.target.classList.contains("overlay")) return;
    const act = btn.dataset.act;
    if (act === "login") {
      data.authenticated = true;
      state.screen = "main";
      persist();
      render();
      return;
    }
    if (act === "logout") {
      data.authenticated = false;
      state.screen = "auth";
      persist();
      render();
      return;
    }
    if (act === "tab") {
      state.tab = btn.dataset.tab;
      state.overlay = { name: "none" };
      render();
      return;
    }
    if (act === "date") {
      data.selectedDate = btn.dataset.date;
      persist();
      render();
      return;
    }
    if (act === "close") {
      state.overlay = { name: "none" };
      render();
      return;
    }
    if (act === "overlay") {
      state.overlay = { name: btn.dataset.name };
      render();
      return;
    }
    if (act === "toggle-mm") {
      state.multimodal = !state.multimodal;
      render();
      return;
    }
    if (act === "send-text") {
      send(btn.dataset.text);
      return;
    }
    if (act === "mode") {
      state.mode = btn.dataset.mode;
      if (btn.dataset.mode === "link") {
        state.overlay = { name: "summarize" };
        render();
      } else runMode(btn.dataset.mode);
      return;
    }
    if (act === "open-week") {
      state.generating = true;
      render();
      setTimeout(() => {
        const plan = buildPlan(data.selectedDate, 0);
        data.plans.push(plan);
        state.generating = false;
        state.overlay = { name: "weekly-plan", planId: plan.id };
        persist();
        render();
      }, 900);
      return;
    }
    if (act === "open-plan") {
      state.overlay = { name: "weekly-plan", planId: btn.dataset.id };
      render();
      return;
    }
    if (act === "save-plan") {
      savePlan(btn.dataset.id);
      return;
    }
    if (act === "convert-plan") {
      convertPlan(btn.dataset.id);
      return;
    }
    if (act === "toggle-edit") {
      state.editingPlan = !state.editingPlan;
      render();
      return;
    }
    if (act === "regen") {
      state.generating = true;
      render();
      setTimeout(() => {
        const cur = data.plans.find((p) => p.id === btn.dataset.id);
        const next = buildPlan(data.selectedDate, (cur?.variant || 0) + 1);
        next.id = btn.dataset.id;
        data.plans = data.plans.map((p) => (p.id === next.id ? next : p));
        state.generating = false;
        persist();
        toast(t("planUpdated"));
      }, 1000);
      return;
    }
    if (act === "save-card" || act === "convert-card") {
      const msg = [...data.messages].reverse().find((m) => m.card);
      if (act === "save-card" && msg?.card) {
        data.saved.unshift({ id: uid("s"), title: msg.card.title, kind: msg.card.type, preview: msg.card.summary || msg.text, payload: msg.card, createdAt: Date.now() });
        persist();
        toast(t("savedWorkspace"));
      }
      if (act === "convert-card" && msg?.card) {
        const titles = msg.card.tasks || (msg.card.bullets || []).map((b) => ({ title: b, category: "work" }));
        titles.forEach((it) => data.tasks.unshift({ id: uid("t"), title: it.title, done: false, category: it.category || "work", source: "ai", date: data.selectedDate }));
        persist();
        toast(t("tasksCreated"));
      }
      return;
    }
    if (act === "note" || act === "edit-note") {
      state.overlay = { name: "note", id: btn.dataset.id };
      render();
      return;
    }
    if (act === "save-note") {
      const title = $("[data-act=note-title]")?.value || t("notes");
      const body = $("[data-act=note-body]")?.value || "";
      if (btn.dataset.id) {
        const n = data.notes.find((x) => x.id === btn.dataset.id);
        if (n) {
          n.title = title;
          n.body = body;
          n.updatedAt = Date.now();
        }
      } else {
        data.notes.unshift({ id: uid("n"), title, body, source: "manual", updatedAt: Date.now() });
      }
      state.overlay = { name: "none" };
      persist();
      toast(state.lang === "zh" ? "笔记已保存" : "Note saved");
      return;
    }
    if (act === "del-note") {
      data.notes = data.notes.filter((n) => n.id !== btn.dataset.id);
      state.overlay = { name: "none" };
      persist();
      render();
      return;
    }
    if (act === "toggle-task") {
      const tk = data.tasks.find((x) => x.id === btn.dataset.id);
      if (tk) tk.done = !tk.done;
      persist();
      render();
      return;
    }
    if (act === "del-task") {
      data.tasks = data.tasks.filter((x) => x.id !== btn.dataset.id);
      persist();
      render();
      return;
    }
    if (act === "trip") {
      state.tab = "chat";
      send(state.lang === "zh" ? "规划行程" : "Plan a trip");
      return;
    }
    if (act === "analyze") {
      runMode("image");
      return;
    }
    if (act === "summarize") {
      state.overlay = { name: "summarize" };
      render();
      return;
    }
    if (act === "tasks") {
      state.overlay = { name: "tasks" };
      render();
      return;
    }
    if (act === "do-link") {
      const url = $("[data-act=url]")?.value || "https://example.com";
      runMode("link", url);
      return;
    }
    if (act === "theme") {
      data.theme = btn.dataset.theme;
      persist();
      render();
      return;
    }
    if (act === "lang") {
      state.lang = btn.dataset.lang === "zh" ? "zh" : btn.dataset.lang === "en" ? "en" : btn.dataset.lang;
      if (!["en", "zh"].includes(state.lang)) {
        /* fallback to English copy, but keep selection */
      }
      persist();
      render();
      return;
    }
    if (act === "pref") {
      data.prefs[btn.dataset.key] = !data.prefs[btn.dataset.key];
      persist();
      render();
      return;
    }
    if (act === "toggle-mem") {
      const m = data.memories.find((x) => x.id === btn.dataset.id);
      if (m) m.enabled = !m.enabled;
      persist();
      render();
      return;
    }
    if (act === "del-mem") {
      data.memories = data.memories.filter((x) => x.id !== btn.dataset.id);
      persist();
      render();
      return;
    }
    if (act === "add-mem") {
      const text = (state.memDraft || "").trim();
      if (!text) return;
      data.memories.unshift({ id: uid("mem"), category: "work", kind: "Note", text, enabled: true, confidence: 72 });
      state.memDraft = "";
      persist();
      render();
      return;
    }
    if (act === "toggle-search") {
      state.showSearch = !state.showSearch;
      render();
      return;
    }
    if (act === "open-saved") {
      const s = data.saved.find((x) => x.id === btn.dataset.id);
      if (s?.payload?.planId) {
        state.overlay = { name: "weekly-plan", planId: s.payload.planId };
      } else state.overlay = { name: "saved", id: btn.dataset.id };
      render();
      return;
    }
  });

  document.getElementById("app").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target.closest("[data-act]");
    if (!form) return;
    if (form.dataset.act === "send-form") send();
    if (form.dataset.act === "add-task-form") {
      const title = $("[data-act=task-title]")?.value?.trim();
      if (!title) return;
      data.tasks.unshift({ id: uid("t"), title, done: false, category: "work", source: "manual", date: data.selectedDate });
      persist();
      render();
    }
  });

  document.getElementById("app").addEventListener("input", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.act === "date-input") {
      data.selectedDate = el.value;
      persist();
      render();
    }
    if (el.dataset.act === "edit-item") {
      const plan = data.plans.find((p) => p.id === el.dataset.plan);
      const item = plan?.items.find((i) => i.id === el.dataset.id);
      if (item) item.title = el.value;
      persist();
    }
    if (el.dataset.act === "search") state.search = el.value;
    if (el.dataset.act === "mem-draft") state.memDraft = el.value;
    if (el.dataset.act === "note-title") state.noteTitle = el.value;
    if (el.dataset.act === "note-body") state.noteBody = el.value;
    if (el.dataset.act === "url") state.url = el.value;
  });

  if (state.screen === "splash") {
    setTimeout(() => {
      state.leaving = true;
      render();
    }, 2200);
    setTimeout(() => {
      state.screen = data.authenticated ? "main" : "auth";
      render();
    }, 2600);
  }
  render();
})();
