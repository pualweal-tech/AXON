import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  bindUser,
  type Session,
  type RunInfo,
  type KeyFlags,
  type User,
} from "./api";
import { emptyData } from "./data";
import { WorkspaceSync, type SyncStatus } from "./sync";
import { attachment } from "./input";
import { modelContext, applyConversions, type Conversion } from "./planning";
import { uid, isoDate } from "./dates";
import { t } from "./i18n";
import type {
  AIProvider,
  AppData,
  PlanItem,
  CardType,
  Category,
  Lang,
  MemoryCategory,
  Overlay,
  Tab,
  ThemeMode,
} from "./types";

export type Screen =
  { id: "splash" } | { id: "auth" } | { id: "unavailable" } | { id: "main" };

type Toast = { text: string; key: number } | null;

interface UIState {
  screen: Screen;
  tab: Tab;
  overlay: Overlay;
  typing: boolean;
  generating: boolean;
  streamText: string;
  sync: SyncStatus;
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
  cancel: () => void;
  restoreRun: (job: RunInfo) => Promise<void>;
  retrySync: () => void;
  keepCloud: () => void;
  exportData: () => void;
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
  saveCard: (
    type: CardType,
    title: string,
    preview: string,
    payload?: unknown,
  ) => void;
  convertTasks: (titles: Conversion[]) => void;
  openWeeklyFrom: (planId?: string) => void;
  regeneratePlan: (planId: string) => Promise<void>;
  editPlanItem: (
    planId: string,
    itemId: string,
    change: Partial<Pick<PlanItem, "title" | "day" | "time">>,
  ) => void;
  addNote: (title: string, body: string, source?: "ai" | "manual") => string;
  updateNote: (id: string, title: string, body: string) => void;
  deleteSaved: (id: string) => void;
  deleteNote: (id: string) => void;
  addTask: (
    title: string,
    category?: Category,
    source?: "ai" | "manual",
    date?: string,
  ) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addMemory: (category: MemoryCategory, kind: string, text: string) => void;
  updateMemory: (id: string, text: string, kind?: string) => void;
  toggleMemory: (id: string) => void;
  deleteMemory: (id: string) => void;
  setPref: (
    key: Exclude<keyof AppData["prefs"], "aiProvider">,
    value: boolean,
  ) => void;
  setProvider: (provider: AIProvider) => void;
  saveApiKey: (provider: AIProvider, key: string | null) => Promise<void>;
  toast: (text: string) => void;
}

const Ctx = createContext<Store | null>(null);

type DataAction =
  | { type: "replace"; data: AppData }
  | { type: "patch"; patch: Partial<AppData> };

function dataReducer(state: AppData, action: DataAction): AppData {
  if (action.type === "replace") return action.data;
  return { ...state, ...action.patch };
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function errorText(err: unknown, lang: Lang): string {
  const code = err instanceof ApiError ? err.code : "";
  if (code === "exists") return t(lang, "emailTaken");
  if (code === "invalid") return t(lang, "loginFailed");
  if (code === "password") return t(lang, "passwordMin");
  if (code === "email") return t(lang, "emailInvalid");
  if (code === "missing_key") return t(lang, "missingApiKey");
  if (code === "rate_limited")
    return lang === "zh"
      ? "请求过于频繁，请稍后重试。"
      : "Request limit reached. Try again later.";
  if (code === "llm") return t(lang, "llmError");
  if (code === "auth" || code === "invalid") return t(lang, "loginFailed");
  if (code === "server") return t(lang, "serverError");
  return t(lang, "requestFailed");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, renderData] = useReducer(dataReducer, emptyData());
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
      streamText: "",
      sync: "saved",
      toast: null,
      composer: "",
      multimodalOpen: false,
    } satisfies UIState,
  );

  const sync = useRef<WorkspaceSync | null>(null);
  const dataRef = useRef(data);
  const run = useRef<AbortController | null>(null);
  const currentUser = useRef("");
  const closing = useRef(false);
  const [systemTheme, setSystemTheme] = useState(() => resolveTheme("system"));
  const resolvedTheme = data.theme === "system" ? systemTheme : data.theme;
  function replace(next: AppData) {
    dataRef.current = next;
    renderData({ type: "replace", data: next });
  }
  function dispatch(action: DataAction) {
    if (
      closing.current ||
      !currentUser.current ||
      user?.id !== currentUser.current
    )
      return;
    const next = dataReducer(dataRef.current, action);
    replace(next);
    sync.current?.change(next);
  }
  const toast = (text: string) => {
    setUi({ toast: { text, key: Date.now() } });
  };
  function cancel() {
    run.current?.abort();
    run.current = null;
    setUi({ typing: false, generating: false, streamText: "" });
  }
  function unbind() {
    sync.current?.dispose();
    sync.current = null;
    cancel();
    currentUser.current = "";
    bindUser("");
    closing.current = false;
    setUser(null);
    setKeys({ openai: false, grok: false, deepseek: false });
    replace(emptyData());
    setUi({
      screen: { id: "auth" },
      tab: "chat",
      overlay: { name: "none" },
      composer: "",
      toast: null,
      multimodalOpen: false,
      sync: "saved",
    });
  }
  function broadcast() {
    localStorage.setItem("axon-session-event", crypto.randomUUID());
  }
  function applySession(session: Session) {
    unbind();
    const id = session.user.id;
    currentUser.current = id;
    bindUser(id);
    setUser(session.user);
    const engine = new WorkspaceSync(id, session, replace, (sync) =>
      setUi({ sync }),
    );
    sync.current = engine;
    replace(engine.local);
    setUi({ screen: { id: "main" } });
    void api
      .keys()
      .then((keys) => {
        if (currentUser.current === id) setKeys(keys);
      })
      .catch(() => {});
  }
  useEffect(() => {
    let live = true;
    void api
      .me()
      .then((session) => {
        if (live) applySession(session);
      })
      .catch((e) => {
        if (live)
          setUi({
            screen: {
              id:
                e instanceof ApiError && e.status === 401
                  ? "auth"
                  : "unavailable",
            },
          });
      });
    const changed = () => {
      unbind();
      window.location.reload();
    };
    const storage = (e: StorageEvent) => {
      if (e.key === "axon-session-event") changed();
    };
    const online = () => {
      void sync.current?.flush().catch(() => {});
    };
    window.addEventListener("storage", storage);
    window.addEventListener("axon-session-changed", changed);
    window.addEventListener("online", online);
    return () => {
      live = false;
      sync.current?.dispose();
      run.current?.abort();
      window.removeEventListener("storage", storage);
      window.removeEventListener("axon-session-changed", changed);
      window.removeEventListener("online", online);
    };
  }, []);
  useEffect(() => {
    if (!ui.toast) return;
    const timer = setTimeout(() => setUi({ toast: null }), 3500);
    return () => clearTimeout(timer);
  }, [ui.toast]);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = data.lang;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#101014" : "#F8F8FA",
      );
  }, [resolvedTheme, data.lang]);
  useEffect(() => {
    if (!user || !data.prefs.hapticStyle) return;
    const seen = new Set<string>();
    const timer = window.setInterval(() => {
      const now = new Date(),
        today = isoDate(now),
        minute =
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0");
      const due = dataRef.current.tasks.filter(
        (t) =>
          !t.done && t.date === today && t.time === minute && !seen.has(t.id),
      );
      if (due.length) {
        due.forEach((t) => seen.add(t.id));
        toast(due.map((t) => t.title).join(" · "));
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [user, data.prefs.hapticStyle]);
  const zh = data.lang === "zh";
  async function exportData() {
    const owner = currentUser.current,
      local = dataRef.current,
      unsynced = sync.current?.exportDrafts();
    const cloud = await api.data().catch(() => null);
    if (currentUser.current !== owner) return;
    const file = new Blob(
      [JSON.stringify({ user, data: local, cloud, unsynced }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "axon-workspace.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function generate(
    mode: "chat" | "plan",
    text?: string,
    multi?: "voice" | "image" | "link" | "document",
    planId?: string,
  ) {
    if (run.current || closing.current) return;
    const controller = new AbortController();
    run.current = controller;
    const snapshot = dataRef.current,
      owner = currentUser.current;
    const valid = () =>
      run.current === controller &&
      currentUser.current === owner &&
      !controller.signal.aborted;
    try {
      let prompt = text?.trim() || "",
        image: string | undefined;
      if (multi) {
        if (multi === "image" && snapshot.prefs.aiProvider !== "openai")
          throw Error(
            zh
              ? "请先选择支持图片的 OpenAI 供应商。"
              : "Select OpenAI for image input.",
          );
        setUi({
          overlay: { name: "multimodal", mode: multi },
          generating: true,
        });
        const input = await attachment(
          multi,
          text,
          snapshot.lang,
          controller.signal,
        );
        if (!valid()) return;
        prompt = input.text;
        image = input.image;
      }
      if (mode === "chat" && !prompt) return;
      if (mode === "chat")
        dispatch({
          type: "patch",
          patch: {
            messages: [
              ...dataRef.current.messages,
              {
                id: uid("m"),
                role: "user",
                text: prompt,
                createdAt: Date.now(),
              },
            ],
          },
        });
      setUi({
        composer: "",
        typing: mode === "chat",
        generating: mode === "plan",
        streamText: "",
        tab: mode === "chat" ? "chat" : ui.tab,
        multimodalOpen: false,
        overlay: planId ? { name: "weekly-plan", planId } : { name: "none" },
      });
      const oldPlan = snapshot.plans.find((p) => p.id === planId);
      const input = {
        runId: crypto.randomUUID(),
        targetPlan: planId,
        provider: snapshot.prefs.aiProvider,
        lang: snapshot.lang,
        date: oldPlan?.weekOf || snapshot.selectedDate,
        text: prompt,
        structuredCards: snapshot.prefs.structuredCards,
        history: snapshot.messages
          .slice(-12)
          .map((m) => ({ role: m.role, text: m.text.slice(0, 3000) })),
        memories: snapshot.prefs.memoryEnabled
          ? snapshot.memories
              .filter((m) => m.enabled)
              .slice(0, 32)
              .map((m) => ({ ...m, text: m.text.slice(0, 1000) }))
          : [],
        context: modelContext(snapshot, prompt),
        image,
        voiceStyle: snapshot.prefs.voiceReplies,
      };
      const result = await api.generate(
        mode,
        input,
        controller.signal,
        (streamText) => {
          if (valid()) setUi({ streamText });
        },
      );
      if (!valid()) return;
      const next = dataRef.current;
      const plan = result.plan;
      if (plan && planId) plan.id = planId;
      const plans = plan
        ? [...next.plans.filter((p) => p.id !== plan.id), plan]
        : next.plans;
      dispatch({
        type: "patch",
        patch: {
          plans,
          messages:
            mode === "chat"
              ? [...next.messages, result.message]
              : next.messages,
        },
      });
      if (mode === "plan" && plan)
        setUi({ overlay: { name: "weekly-plan", planId: plan.id } });
    } catch (e) {
      if (valid() && !(e instanceof DOMException && e.name === "AbortError"))
        toast(
          e instanceof ApiError
            ? errorText(e, data.lang)
            : e instanceof Error
              ? e.message
              : t(data.lang, "requestFailed"),
        );
    } finally {
      if (run.current === controller) {
        run.current = null;
        setUi({
          typing: false,
          generating: false,
          streamText: "",
          ...(multi ? { overlay: { name: "none" as const } } : {}),
        });
      }
    }
  }
  const value: Store = {
    data,
    ui,
    user,
    keys,
    resolvedTheme,
    restoreRun: async (job) => {
      if (run.current) return;
      const owner = currentUser.current,
        ctl = new AbortController();
      run.current = ctl;
      try {
        setUi({
          typing: job.mode === "chat",
          generating: job.mode === "plan",
          tab: "chat",
          overlay: { name: "none" },
        });
        const saved = await api.run(job.id);
        if (run.current !== ctl || currentUser.current !== owner) return;
        const result =
          saved.result ??
          (await api.generate(saved.mode, saved.input, ctl.signal, (text) => {
            if (run.current === ctl) setUi({ streamText: text });
          }));
        if (run.current !== ctl || currentUser.current !== owner) return;
        const next = dataRef.current,
          plan = result.plan;
        const plans =
          plan && !next.plans.some((p) => p.id === plan.id)
            ? [...next.plans, plan]
            : next.plans;
        const messages =
          job.mode === "chat" &&
          !next.messages.some((m) => m.id === result.message.id)
            ? [...next.messages, result.message]
            : next.messages;
        dispatch({ type: "patch", patch: { plans, messages } });
        if (plan && job.mode === "plan")
          setUi({ overlay: { name: "weekly-plan", planId: plan.id } });
      } catch (e) {
        if (run.current === ctl) toast(errorText(e, data.lang));
      } finally {
        if (run.current === ctl) {
          run.current = null;
          setUi({ typing: false, generating: false, streamText: "" });
        }
      }
    },
    cancel,
    exportData,
    keepCloud: () =>
      void sync.current
        ?.keepCloud()
        .catch(() => toast(t(data.lang, "requestFailed"))),
    retrySync: () => void sync.current?.flush().catch(() => {}),
    register: async (email, password, name) => {
      const initial = await api.register(email, password, name);
      let res: Session;
      if ("challenge" in initial) {
        const code = window.prompt(
          zh
            ? "输入邮件中的验证码（10 分钟有效）"
            : "Enter the verification code sent by email (10 minutes)",
        );
        if (!code) return;
        res = await api.verify(initial.challenge, code.trim());
      } else res = initial;
      applySession(res);
      broadcast();
      if (res.recovery)
        window.prompt(
          zh ? "请安全保存账号恢复码" : "Save your account recovery code",
          res.recovery,
        );
    },
    login: async (email, password) => {
      applySession(await api.login(email, password));
      broadcast();
    },
    logout: async () => {
      if (closing.current) return;
      closing.current = true;
      cancel();
      try {
        await sync.current?.flush();
        await api.logout();
        localStorage.removeItem("axon:data:" + currentUser.current);
        unbind();
        broadcast();
      } catch {
        closing.current = false;
        toast(
          zh
            ? "退出未完成。请先同步或导出未保存的修改。"
            : "Sign out failed. Sync or export pending edits first.",
        );
      }
    },
    setTab: (tab) => setUi({ tab, overlay: { name: "none" } }),
    setOverlay: (overlay) => setUi({ overlay }),
    setTheme: (theme) => dispatch({ type: "patch", patch: { theme } }),
    setLang: (lang) => dispatch({ type: "patch", patch: { lang } }),
    setDate: (selectedDate) =>
      dispatch({ type: "patch", patch: { selectedDate } }),
    setComposer: (composer) => setUi({ composer }),
    setMultimodalOpen: (multimodalOpen) => setUi({ multimodalOpen }),
    toast,
    sendMessage: (text) => generate("chat", text ?? ui.composer),
    runMultimodal: (mode, extra) => generate("chat", extra, mode),
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
    convertTasks: (items) => {
      const { tasks, conflicts } = applyConversions(
        dataRef.current.tasks,
        items,
        data.selectedDate,
      );
      dispatch({ type: "patch", patch: { tasks } });
      toast(
        conflicts.length
          ? (zh
              ? "未安排（时间冲突或任务已变更）："
              : "Skipped due to calendar conflicts or changed tasks: ") +
              conflicts.join(" · ")
          : t(data.lang, "tasksCreated"),
      );
    },
    openWeeklyFrom: (planId) => {
      if (planId) setUi({ overlay: { name: "weekly-plan", planId } });
      else void generate("plan");
    },
    regeneratePlan: (planId) => generate("plan", "", undefined, planId),
    editPlanItem: (planId, itemId, change) => {
      dispatch({
        type: "patch",
        patch: {
          plans: data.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  items: p.items.map((i) =>
                    i.id === itemId ? { ...i, ...change } : i,
                  ),
                }
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
    deleteSaved: (id) =>
      dispatch({
        type: "patch",
        patch: { saved: dataRef.current.saved.filter((s) => s.id !== id) },
      }),
    deleteNote: (id) => {
      dispatch({
        type: "patch",
        patch: { notes: data.notes.filter((n) => n.id !== id) },
      });
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
        patch: {
          tasks: data.tasks.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
          ),
        },
      });
    },
    deleteTask: (id) => {
      dispatch({
        type: "patch",
        patch: { tasks: data.tasks.filter((item) => item.id !== id) },
      });
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
              updatedAt: Date.now(),
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
            m.id === id
              ? { ...m, text, updatedAt: Date.now(), kind: kind ?? m.kind }
              : m,
          ),
        },
      });
    },
    toggleMemory: (id) => {
      dispatch({
        type: "patch",
        patch: {
          memories: data.memories.map((m) =>
            m.id === id ? { ...m, enabled: !m.enabled } : m,
          ),
        },
      });
    },
    deleteMemory: (id) => {
      dispatch({
        type: "patch",
        patch: { memories: data.memories.filter((m) => m.id !== id) },
      });
    },
    setPref: (key, value) => {
      dispatch({
        type: "patch",
        patch: { prefs: { ...data.prefs, [key]: value } },
      });
    },
    setProvider: (aiProvider) => {
      dispatch({
        type: "patch",
        patch: { prefs: { ...data.prefs, aiProvider } },
      });
    },
    saveApiKey: async (provider, key) => {
      const owner = currentUser.current;
      const next = await api.saveKeys({ [provider]: key });
      if (currentUser.current !== owner) return;
      setKeys(next);
      toast(
        key
          ? t(data.lang, "keySaved")
          : data.lang === "zh"
            ? "密钥已移除"
            : "Key removed",
      );
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
  return data.prefs.memoryEnabled && data.memories.length
    ? Math.round((active / data.memories.length) * 100)
    : 0;
}
