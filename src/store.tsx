import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type KeyFlags, type User } from "./api";
import { emptyData, mergeData } from "./data";
import { uid } from "./dates";
import { t } from "./i18n";
import type {
  AIProvider,
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
  user: User | null;
  keys: KeyFlags;
  resolvedTheme: "light" | "dark";
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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
  setPref: (key: Exclude<keyof AppData["prefs"], "aiProvider">, value: boolean) => void;
  setProvider: (provider: AIProvider) => void;
  saveApiKey: (provider: AIProvider, key: string | null) => Promise<void>;
  toast: (text: string) => void;
}

const Ctx = createContext<Store | null>(null);

function cacheKey(userId: string): string {
  return `axon:data:${userId}`;
}

function readCachedData(userId: string): Partial<AppData> | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Partial<AppData>) : null;
  } catch {
    return null;
  }
}

function writeCachedData(userId: string, data: AppData): void {
  try {
    const { authenticated, ...payload } = data;
    void authenticated;
    localStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

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

function errorText(err: unknown, lang: Lang): string {
  const code = err instanceof ApiError ? err.code : "";
  if (code === "exists") return t(lang, "emailTaken");
  if (code === "invalid") return t(lang, "loginFailed");
  if (code === "password") return t(lang, "passwordMin");
  if (code === "email") return t(lang, "emailInvalid");
  if (code === "missing_key") return t(lang, "missingApiKey");
  if (code === "llm") return t(lang, "llmError");
  if (code === "auth" || code === "invalid") return t(lang, "loginFailed");
  if (code === "server") return t(lang, "serverError");
  return t(lang, "requestFailed");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(dataReducer, emptyData());
  const [user, setUser] = useState<User | null>(null);
  const [keys, setKeys] = useState<KeyFlags>({
    openai: false,
    grok: false,
    deepseek: false,
  });
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

  const hydratedRef = useRef(false);
  const dataRef = useRef(data);
  const userRef = useRef(user);
  dataRef.current = data;
  userRef.current = user;

  const resolvedTheme = useMemo(() => resolveTheme(data.theme), [data.theme]);

  useEffect(() => {
    let stop = false;
    const started = Date.now();
    void (async () => {
      let sessionUser: User | null = null;
      try {
        const session = await api.me();
        if (stop) return;
        sessionUser = session.user;
        setUser(session.user);
        const incoming = session.data ?? readCachedData(session.user.id);
        dispatch({ type: "replace", data: mergeData(incoming) });
        writeCachedData(session.user.id, mergeData(incoming));
        try {
          setKeys(await api.keys());
        } catch {
          /* keys optional */
        }
        hydratedRef.current = true;
      } catch {
        if (stop) return;
      }
      const wait = Math.max(400, 2200 - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (stop) return;
      setUi({ screen: { id: sessionUser ? "main" : "auth" } });
    })();
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !data.authenticated) return;
    const userId = userRef.current?.id;
    if (userId) writeCachedData(userId, dataRef.current);
    const timer = window.setTimeout(() => {
      void api.saveData(dataRef.current).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
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

  const applySession = (nextUser: User, payload: Partial<AppData> | null) => {
    const incoming = payload ?? readCachedData(nextUser.id);
    setUser(nextUser);
    const next = mergeData(incoming);
    dispatch({ type: "replace", data: next });
    writeCachedData(nextUser.id, next);
    hydratedRef.current = true;
    setUi({ screen: { id: "main" }, overlay: { name: "none" }, tab: "chat" });
    void api.keys().then(setKeys).catch(() => undefined);
  };

  const value: Store = {
    data,
    ui,
    user,
    keys,
    resolvedTheme,
    register: async (email, password, name) => {
      const res = await api.register(email, password, name);
      applySession(res.user, res.data);
    },
    login: async (email, password) => {
      const res = await api.login(email, password);
      applySession(res.user, res.data);
    },
    logout: () => {
      hydratedRef.current = false;
      void api.logout().catch(() => undefined);
      setUser(null);
      dispatch({ type: "replace", data: emptyData() });
      setKeys({ openai: false, grok: false, deepseek: false });
      setUi({ screen: { id: "auth" }, tab: "chat", overlay: { name: "none" } });
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
      const snapshot = dataRef.current;
      const userMsg = {
        id: uid("m"),
        role: "user" as const,
        text: content,
        createdAt: Date.now(),
      };
      const history = [...snapshot.messages, userMsg];
      dispatch({ type: "patch", patch: { messages: history } });
      setUi({ composer: "", typing: true, multimodalOpen: false, tab: "chat" });
      try {
        const result = await api.chat({
          text: content,
          provider: snapshot.prefs.aiProvider,
          lang: snapshot.lang,
          date: snapshot.selectedDate,
          memories: snapshot.prefs.memoryEnabled ? snapshot.memories : [],
          structuredCards: snapshot.prefs.structuredCards,
          history: snapshot.messages.map((m) => ({ role: m.role, text: m.text })),
        });
        const plans = result.plan ? [...dataRef.current.plans, result.plan] : dataRef.current.plans;
        dispatch({
          type: "patch",
          patch: { messages: [...history, result.message], plans },
        });
      } catch (err) {
        toast(errorText(err, snapshot.lang));
      }
      setUi({ typing: false });
    },
    runMultimodal: async (mode, extra) => {
      const snapshot = dataRef.current;
      setUi({ generating: true, overlay: { name: "multimodal", mode }, tab: "chat" });
      const prompt =
        mode === "voice"
          ? snapshot.lang === "zh"
            ? "帮我规划这一周"
            : "Plan my week"
          : mode === "link"
            ? `${snapshot.lang === "zh" ? "总结这个页面：" : "Summarize this page: "} ${extra || ""}`
            : mode === "image"
              ? snapshot.lang === "zh"
                ? "分析这张图片的设计与信息，给出可执行建议。"
                : "Analyze this image and give actionable design notes."
              : snapshot.lang === "zh"
                ? "阅读这份文档，提取可执行要点。"
                : "Read this document and extract actionable points.";
      try {
        const result = await api.chat({
          text: prompt,
          provider: snapshot.prefs.aiProvider,
          lang: snapshot.lang,
          date: snapshot.selectedDate,
          memories: snapshot.prefs.memoryEnabled ? snapshot.memories : [],
          structuredCards: snapshot.prefs.structuredCards,
          history: snapshot.messages.map((m) => ({ role: m.role, text: m.text })),
        });
        const plans = result.plan ? [...dataRef.current.plans, result.plan] : dataRef.current.plans;
        dispatch({
          type: "patch",
          patch: { messages: [...dataRef.current.messages, result.message], plans },
        });
      } catch (err) {
        toast(errorText(err, snapshot.lang));
      }
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
      toast(t(data.lang, "savedWorkspace"));
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
      toast(t(data.lang, "tasksCreated"));
    },
    openWeeklyFrom: (planId) => {
      if (planId) {
        setUi({ overlay: { name: "weekly-plan", planId } });
        return;
      }
      setUi({ generating: true });
      void (async () => {
        const snapshot = dataRef.current;
        try {
          const { plan } = await api.plan({
            provider: snapshot.prefs.aiProvider,
            lang: snapshot.lang,
            date: snapshot.selectedDate,
            memories: snapshot.prefs.memoryEnabled ? snapshot.memories : [],
          });
          dispatch({ type: "patch", patch: { plans: [...snapshot.plans, plan] } });
          setUi({ generating: false, overlay: { name: "weekly-plan", planId: plan.id } });
        } catch (err) {
          setUi({ generating: false });
          toast(errorText(err, snapshot.lang));
        }
      })();
    },
    regeneratePlan: async (planId) => {
      setUi({ generating: true });
      const snapshot = dataRef.current;
      try {
        const { plan } = await api.plan({
          provider: snapshot.prefs.aiProvider,
          lang: snapshot.lang,
          date: snapshot.selectedDate,
          memories: snapshot.prefs.memoryEnabled ? snapshot.memories : [],
        });
        plan.id = planId;
        dispatch({
          type: "patch",
          patch: { plans: snapshot.plans.map((p) => (p.id === planId ? plan : p)) },
        });
        toast(t(snapshot.lang, "planUpdated"));
      } catch (err) {
        toast(errorText(err, snapshot.lang));
      }
      setUi({ generating: false });
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
        title: title || t(data.lang, "untitledNote"),
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
      toast(t(data.lang, "deleted"));
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
        patch: { tasks: data.tasks.map((item) => (item.id === id ? { ...item, done: !item.done } : item)) },
      });
    },
    deleteTask: (id) => {
      dispatch({ type: "patch", patch: { tasks: data.tasks.filter((item) => item.id !== id) } });
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
    setProvider: (aiProvider) => {
      dispatch({ type: "patch", patch: { prefs: { ...data.prefs, aiProvider } } });
    },
    saveApiKey: async (provider, key) => {
      const next = await api.saveKeys({ [provider]: key });
      setKeys(next);
      toast(t(data.lang, "keySaved"));
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
