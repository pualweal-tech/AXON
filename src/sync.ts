import { api, ApiError, type State } from "./api";
import { mergeData } from "./data";
import { workspace } from "./schema";
import type { AppData } from "./types";

function equal(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export function mergeChanges(
  base: unknown,
  local: unknown,
  remote: unknown,
): unknown {
  if (equal(local, base)) return remote;
  if (equal(remote, base) || equal(local, remote)) return local;
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const arrays = [base, local, remote];
    if (
      arrays.every((a) => a.every((x) => record(x) && typeof x.id === "string"))
    ) {
      const [b, l, r] = arrays.map((a) => new Map(a.map((x) => [x.id, x])));
      return [...new Set([...l.keys(), ...r.keys(), ...b.keys()])]
        .map((id) => mergeChanges(b.get(id), l.get(id), r.get(id)))
        .filter((v) => v !== undefined);
    }
  }
  if (record(base) && record(local) && record(remote)) {
    return Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(base),
          ...Object.keys(local),
          ...Object.keys(remote),
        ]),
      ]
        .map((k) => [k, mergeChanges(base[k], local[k], remote[k])])
        .filter(([, v]) => v !== undefined),
    );
  }
  throw new ApiError("edit_conflict", 409);
}
type Draft = { base: AppData; local: AppData };
export type SyncStatus =
  "saved" | "pending" | "offline" | "conflict" | "storage";
export class WorkspaceSync {
  base: AppData;
  local: AppData;
  revision: number;
  private key: string;
  private prefix: string;
  private active = true;
  private timer?: number;
  private running?: Promise<void>;
  private recoveryBlocked = false;
  private recovered = new Map<string, string>();
  constructor(
    id: string,
    state: State,
    private apply: (data: AppData) => void,
    private status: (value: SyncStatus) => void,
  ) {
    this.prefix = "axon:pending:" + id + ":";
    this.key = this.prefix + crypto.randomUUID();
    this.base = mergeData(state.data);
    this.local = this.base;
    this.revision = state.revision;
    try {
      for (const key of Object.keys(localStorage).filter((k) =>
        k.startsWith(this.prefix),
      )) {
        const raw = localStorage.getItem(key)!;
        this.recovered.set(key, raw);
        const draft = JSON.parse(raw) as Draft;
        const merged = mergeChanges(draft.base, draft.local, this.local);
        this.local = mergeData(workspace.parse(merged) as Partial<AppData>);
      }
      const old = localStorage.getItem("axon:data:" + id);
      if (old && !state.data && !this.recovered.size)
        this.local = mergeData(
          workspace.parse(JSON.parse(old)) as Partial<AppData>,
        );
      if (old && !state.data) this.recovered.set("axon:data:" + id, old);
      if (!equal(this.local, this.base) || this.recovered.size)
        this.change(this.local);
    } catch {
      this.recoveryBlocked = true;
      this.status("conflict");
    }
  }
  change(data: AppData) {
    this.local = data;
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({ base: this.base, local: data }),
      );
      this.status("pending");
    } catch {
      this.status("storage");
    }
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(
      () => void this.flush().catch(() => {}),
      200,
    );
  }
  flush(): Promise<void> {
    if (!this.active) return Promise.resolve();
    if (this.recoveryBlocked) {
      this.status("conflict");
      return Promise.reject(new ApiError("edit_conflict", 409));
    }
    if (!this.running)
      this.running = this.drain()
        .catch((e) => {
          if (this.active)
            this.status(
              e instanceof ApiError && e.code === "edit_conflict"
                ? "conflict"
                : "offline",
            );
          throw e;
        })
        .finally(() => {
          this.running = undefined;
        });
    return this.running;
  }
  private async drain() {
    for (
      let attempt = 0;
      this.active && !equal(this.local, this.base);
      attempt++
    ) {
      if (attempt >= 12) throw new ApiError("busy", 409);
      const sent = this.local;
      try {
        const result = await api.saveData(sent, this.revision);
        if (!this.active) return;
        this.revision = result.revision;
        this.base = sent;
      } catch (e) {
        if (!(e instanceof ApiError) || e.code !== "conflict") throw e;
        const state = await api.data();
        if (!this.active) return;
        const remote = mergeData(state.data);
        const merged = mergeChanges(this.base, this.local, remote) as AppData;
        this.base = remote;
        this.revision = state.revision;
        this.local = merged;
        this.apply(merged);
      }
      if (!equal(this.local, this.base))
        localStorage.setItem(
          this.key,
          JSON.stringify({ base: this.base, local: this.local }),
        );
    }
    if (this.active) {
      localStorage.removeItem(this.key);
      for (const [key, raw] of this.recovered)
        if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
      this.recovered.clear();
      this.status("saved");
    }
  }
  async keepCloud() {
    const localAtStart = this.local;
    const drafts = new Map<string, string | null>(this.recovered);
    drafts.set(this.key, localStorage.getItem(this.key));
    const latest = await api.data();
    if (!this.active || this.local !== localAtStart) return;
    for (const [k, v] of drafts)
      if (localStorage.getItem(k) === v) localStorage.removeItem(k);
    this.recoveryBlocked = false;
    this.recovered.clear();
    this.revision = latest.revision;
    this.base = mergeData(latest.data);
    this.local = this.base;
    this.apply(this.local);
    this.status("saved");
  }
  exportDrafts() {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(this.prefix))
      .map((k) => {
        const raw = localStorage.getItem(k);
        try {
          return JSON.parse(raw!);
        } catch {
          return raw;
        }
      });
  }
  dispose() {
    this.active = false;
    clearTimeout(this.timer);
  }
}
