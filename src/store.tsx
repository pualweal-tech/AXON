import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { attachPlan, buildWeeklyPlan, multimodalReply, replyFor } from "./ai";
import { defaultData } from "./data";
import { uid } from "./dates";
import { loadData, saveData } from "./storage";
import type {
  AppData,
  CardType,
  Category,
  Lang,
  MemoryCategory,
  Overlay,
  Tab,
  ThemeMode,
} from "./types";

export type Screen = { id: "splash" } | { id: "auth" } | { id: "main" };

type Toast = { text: string; key: number } | null;

interface UIState {
  screen: Screen;
  tab: Tab;
  overlay: Overlay;
  typing: boolean;
  generating: boolean;
  toast: Toast;
  composer: string;
  multimodalOpen: boolean;
}

interface Store {
  data: AppData;
  ui: UIState;
  resolvedTheme: "light" | "dark";
  login: () => void;
  logout: () => void;
  setTab: (tab: Tab) => void;
  setOverlay: (overlay: Overlay) => void;
  setTheme: (theme: ThemeMode) => void;
  setLang: (lang: Lang) => void;
  setDate: (iso: string) => void;
  setComposer: (v: string) => void;
  setMultimodalOpen: (v: boolean) => void;
  sendMessage: (text?: string) => Promise<void>;
  runMultimodal: (
    mode: "voice" | "image" | "link" | "document",
    extra?: string,
  ) => Promise<void>;
  saveCard: (type: CardType, title: string, preview: string, payload?: unknown) => void;
  convertTasks: (titles: { title: string; category: Category }[]) => void;
  openWeeklyFrom: (planId?: string) => void;
  regeneratePlan: (planId: string) => Promise<void>;
  editPlanItem: (planId: string, itemId: string, title: string) => void;
  addNote: (title: string, body: string, source?: "ai" | "manual") => string;
  updateNote: (id: string, title: string, body: string) => void;
  deleteNote: (id: string) => void;
  addTask: (title: string, category?: Category, source?: "ai" | "manual", date?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addMemory: (category: MemoryCategory, kind: string, text: string) => void;
  updateMemory: (id: string, text: string, kind?: string) => void;
  toggleMemory: (id: string) => void;
  deleteMemory: (id: string) => void;
  setPref: (key: keyof AppData["prefs"], value: boolean) => void;
  toast: (text: string) => void;
  skipSplash: () => void;
}

const Ctx = createContext<Store | null>(null);

type DataAction = { type: "replace"; data: AppData } | { type: "patch"; patch: Partial<AppData> };

function dataReducer(state: AppData, action: DataAction): AppData {
  if (action.type === "replace") return action.data;
  return { ...state, ...action.patch };
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(dataReducer, defaultData(), loadData);
  const [ui, setUi] = useReducer(
    (s: UIState, p: Partial<UIState>) => ({ ...s, ...p }),
    {
      screen: { id: "splash" },
      tab: "chat",
      overlay: { name: "none" },
      typing: false,
      generating: false,
      toast: null,
      composer: "",
      multimodalOpen: false,
    } satisfies UIState,
  );

  const resolvedTheme = useMemo(() => resolveTheme(data.theme), [data.theme]);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = data.lang === "zh" ? "zh-CN" : "en";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? "#101014" : "#F8F8FA");
  }, [resolvedTheme, data.lang]);

  useEffect(() => {
    if (data.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => dispatch({ type: "patch", patch: { theme: "system" } });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [data.theme]);

  const toast = (text: string) => {
    setUi({ toast: { text, key: Date.now() } });
    window.setTimeout(() => setUi({ toast: null }), 1800);
  };

  const value: Store = {
    data,
    ui,
    resolvedTheme,
    login: () => {
      dispatch({ type: "patch", patch: { authenticated: true } });
      setUi({ screen: { id: "main" } });
    },
    logout: () => {
      dispatch({ type: "patch", patch: { authenticated: false } });
      setUi({ screen: { id: "auth" }, tab: "chat", overlay: { name: "none" } });
    },
    skipSplash: () => {
      setUi({ screen: { id: data.authenticated ? "main" : "auth" } });
    },
    setTab: (tab) => setUi({ tab, overlay: { name: "none" } }),
    setOverlay: (overlay) => setUi({ overlay }),
    setTheme: (theme) => dispatch({ type: "patch", patch: { theme } }),
    setLang: (lang) => dispatch({ type: "patch", patch: { lang } }),
    setDate: (selectedDate) => dispatch({ type: "patch", patch: { selectedDate } }),
    setComposer: (composer) => setUi({ composer }),
    setMultimodalOpen: (multimodalOpen) => setUi({ multimodalOpen }),
    toast,
    sendMessage: async (text) => {
      const content = (text ?? ui.composer).trim();
      if (!content) return;
      const user = {
        id: uid("m"),
        role: "user" as const,
        text: content,
        createdAt: Date.now(),
      };
      dispatch({ type: "patch", patch: { messages: [...data.messages, user] } });
      setUi({ composer: "", typing: true, multimodalOpen: false, tab: "chat" });
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));
      const draft = replyFor(content, data.lang, data.selectedDate, 0);
      let plans = data.plans;
      let message = draft;
      if (draft.card?.type === "weekly") {
        const plan = buildWeeklyPlan(data.selectedDate, 0);
        plans = [...data.plans, plan];
        message = attachPlan(draft, plan);
      }
      dispatch({
        type: "patch",
        patch: { messages: [...data.messages, user, message], plans },
      });
      setUi({ typing: false });
    },
    runMultimodal: async (mode, extra) => {
      setUi({ generating: true, overlay: { name: "multimodal", mode }, tab: "chat" });
      await new Promise((r) => setTimeout(r, 1400));
      const msg = multimodalReply(mode, data.lang, extra);
      let plans = data.plans;
      let message = msg;
      if (msg.card?.type === "weekly") {
        const plan = buildWeeklyPlan(data.selectedDate, 0);
        plans = [...data.plans, plan];
        message = attachPlan(msg, plan);
      }
      dispatch({
        type: "patch",
        patch: { messages: [...data.messages, message], plans },
      });
      setUi({ generating: false, overlay: { name: "none" }, multimodalOpen: false });
    },
    saveCard: (kind, title, preview, payload) => {
      dispatch({
        type: "patch",
        patch: {
          saved: [
            {
              id: uid("s"),
              title,
              kind,
              preview,
              payload,
              createdAt: Date.now(),
            },
            ...data.saved,
          ],
        },
      });
      toast(data.lang === "zh" ? "已保存到工作区" : "Saved to Workspace");
    },
    convertTasks: (titles) => {
      dispatch({
        type: "patch",
        patch: {
          tasks: [
            ...titles.map((item) => ({
              id: uid("t"),
              title: item.title,
              done: false,
              category: item.category,
              source: "ai" as const,
              date: data.selectedDate,
              createdAt: Date.now(),
            })),
            ...data.tasks,
          ],
        },
      });
      toast(data.lang === "zh" ? "任务已加入工作区" : "Tasks added to Workspace");
    },
    openWeeklyFrom: (planId) => {
      if (planId) {
        setUi({ overlay: { name: "weekly-plan", planId } });
        return;
      }
      setUi({ generating: true });
      window.setTimeout(() => {
        const plan = buildWeeklyPlan(data.selectedDate, 0);
        dispatch({ type: "patch", patch: { plans: [...data.plans, plan] } });
        setUi({ generating: false, overlay: { name: "weekly-plan", planId: plan.id } });
      }, 900);
    },
    regeneratePlan: async (planId) => {
      setUi({ generating: true });
      await new Promise((r) => setTimeout(r, 1100));
      const current = data.plans.find((p) => p.id === planId);
      const next = buildWeeklyPlan(data.selectedDate, (current?.variant ?? 0) + 1);
      next.id = planId;
      dispatch({
        type: "patch",
        patch: { plans: data.plans.map((p) => (p.id === planId ? next : p)) },
      });
      setUi({ generating: false });
      toast(data.lang === "zh" ? "计划已更新" : "Plan updated");
    },
    editPlanItem: (planId, itemId, title) => {
      dispatch({
        type: "patch",
        patch: {
          plans: data.plans.map((p) =>
            p.id === planId
              ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, title } : i)) }
              : p,
          ),
        },
      });
    },
    addNote: (title, body, source = "manual") => {
      const note = {
        id: uid("n"),
        title: title || (data.lang === "zh" ? "未命名笔记" : "Untitled note"),
        body,
        source,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: "patch", patch: { notes: [note, ...data.notes] } });
      return note.id;
    },
    updateNote: (id, title, body) => {
      dispatch({
        type: "patch",
        patch: {
          notes: data.notes.map((n) =>
            n.id === id ? { ...n, title, body, updatedAt: Date.now() } : n,
          ),
        },
      });
    },
    deleteNote: (id) => {
      dispatch({ type: "patch", patch: { notes: data.notes.filter((n) => n.id !== id) } });
      toast(data.lang === "zh" ? "已删除" : "Deleted");
    },
    addTask: (title, category = "work", source = "manual", date) => {
      dispatch({
        type: "patch",
        patch: {
          tasks: [
            {
              id: uid("t"),
              title,
              done: false,
              category,
              source,
              date: date || data.selectedDate,
              createdAt: Date.now(),
            },
            ...data.tasks,
          ],
        },
      });
    },
    toggleTask: (id) => {
      dispatch({
        type: "patch",
        patch: { tasks: data.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) },
      });
    },
    deleteTask: (id) => {
      dispatch({ type: "patch", patch: { tasks: data.tasks.filter((t) => t.id !== id) } });
    },
    addMemory: (category, kind, text) => {
      dispatch({
        type: "patch",
        patch: {
          memories: [
            {
              id: uid("mem"),
              category,
              kind,
              text,
              enabled: true,
              confidence: 72,
            },
            ...data.memories,
          ],
        },
      });
    },
    updateMemory: (id, text, kind) => {
      dispatch({
        type: "patch",
        patch: {
          memories: data.memories.map((m) =>
            m.id === id ? { ...m, text, kind: kind ?? m.kind } : m,
          ),
        },
      });
    },
    toggleMemory: (id) => {
      dispatch({
        type: "patch",
        patch: {
          memories: data.memories.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
        },
      });
    },
    deleteMemory: (id) => {
      dispatch({ type: "patch", patch: { memories: data.memories.filter((m) => m.id !== id) } });
    },
    setPref: (key, value) => {
      dispatch({ type: "patch", patch: { prefs: { ...data.prefs, [key]: value } } });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("store");
  return ctx;
}

export function contextScore(data: AppData): number {
  const active = data.memories.filter((m) => m.enabled).length;
  return Math.min(99, 54 + active * 7 + (data.prefs.memoryEnabled ? 4 : 0));
}
