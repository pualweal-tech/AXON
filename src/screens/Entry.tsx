import { useEffect, useState } from "react";
import { t } from "../i18n";
import { AxonMark } from "../icons";
import { api, ApiError } from "../api";
import { useStore } from "../store";

function normalizeEmail(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/＠/g, "@")
    .replace(/\s+/g, "");
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function Splash() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    return () => window.clearTimeout(fade);
  }, []);

  return (
    <div className={"splash" + (leaving ? " leaving" : "")}>
      <img
        src="/logo.svg"
        alt="AXON"
        className="splash-logo"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          el.nextElementSibling?.removeAttribute("hidden");
        }}
      />
      <div hidden>
        <AxonMark size={96} />
      </div>
    </div>
  );
}

export function Auth() {
  const { data, login, register } = useStore();
  const lang = data.lang;
  const [mode, setMode] = useState<"login" | "signup" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    const cleaned = normalizeEmail(email);
    if (!isEmail(cleaned)) {
      setError(t(lang, "emailInvalid"));
      return;
    }
    if (password.length < 8) {
      setError(t(lang, "passwordMin"));
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError(t(lang, "passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") await register(cleaned, password, name);
      else if (mode === "recover") {
        const result = await api.recover(cleaned, password, recovery.trim());
        window.prompt(
          lang === "zh" ? "请保存新的恢复码" : "Save your new recovery code",
          result.recovery,
        );
        await login(cleaned, password);
      } else await login(cleaned, password);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "exists") setError(t(lang, "emailTaken"));
      else if (code === "password") setError(t(lang, "passwordMin"));
      else if (code === "email") setError(t(lang, "emailInvalid"));
      else if (code === "invalid") setError(t(lang, "loginFailed"));
      else if (code === "server") setError(t(lang, "serverError"));
      else setError(t(lang, "requestFailed"));
    }
    setBusy(false);
  };

  return (
    <div className="auth">
      <AxonMark size={64} />
      <h1>{t(lang, "axon")}</h1>
      <p className="page-sub">{t(lang, "tagline")}</p>
      <form
        className="auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={"mode-chip" + (mode === "login" ? " on" : "")}
            onClick={() => setMode("login")}
          >
            {t(lang, "logIn")}
          </button>
          <button
            type="button"
            className={"mode-chip" + (mode === "signup" ? " on" : "")}
            onClick={() => setMode("signup")}
          >
            {t(lang, "signUp")}
          </button>
        </div>
        {mode === "signup" && (
          <input
            className="field"
            value={name}
            placeholder={t(lang, "namePlaceholder")}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="field"
          type="text"
          inputMode="email"
          value={email}
          placeholder={t(lang, "emailPlaceholder")}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field"
          type="password"
          value={password}
          placeholder={
            mode === "recover"
              ? lang === "zh"
                ? "新密码"
                : "New password"
              : t(lang, "passwordPlaceholder")
          }
          autoComplete={mode !== "login" ? "new-password" : "current-password"}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && (
          <input
            className="field"
            type="password"
            value={confirm}
            placeholder={t(lang, "confirmPassword")}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
        {mode === "recover" && (
          <input
            className="field"
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
            placeholder={lang === "zh" ? "账号恢复码" : "Account recovery code"}
          />
        )}
        {error && <p className="auth-error">{error}</p>}
        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={busy}
        >
          {busy
            ? t(lang, "pleaseWait")
            : mode === "recover"
              ? lang === "zh"
                ? "重设密码"
                : "Reset password"
              : mode === "signup"
                ? t(lang, "createAccount")
                : t(lang, "logIn")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setMode(mode === "recover" ? "login" : "recover")}
        >
          {lang === "zh"
            ? "使用恢复码重设密码"
            : "Reset password with recovery code"}
        </button>
        <p className="page-sub">{t(lang, "registerHint")}</p>
      </form>
    </div>
  );
}
