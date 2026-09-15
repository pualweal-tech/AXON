import { useEffect, useState } from "react";
import { t } from "../i18n";
import { AxonMark } from "../icons";
import { ApiError } from "../api";
import { useStore } from "../store";

export function Splash() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    return () => window.clearTimeout(fade);
  }, []);

  return (
    <div className={"splash" + (leaving ? " leaving" : "")}>
      <img src="/logo.png" alt="AXON" className="splash-logo" onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
        el.nextElementSibling?.removeAttribute("hidden");
      }} />
      <div hidden>
        <AxonMark size={96} />
      </div>
    </div>
  );
}

export function Auth() {
  const { data, login, register } = useStore();
  const lang = data.lang;
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (mode === "signup" && password !== confirm) {
      setError(t(lang, "passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") await register(email, password, name);
      else await login(email, password);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "exists") setError(t(lang, "emailTaken"));
      else if (code === "password") setError(t(lang, "passwordMin"));
      else if (code === "email") setError(t(lang, "emailInvalid"));
      else if (code === "invalid") setError(t(lang, "loginFailed"));
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
          type="email"
          value={email}
          placeholder={t(lang, "emailPlaceholder")}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field"
          type="password"
          value={password}
          placeholder={t(lang, "passwordPlaceholder")}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
        {error && <p className="auth-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? t(lang, "pleaseWait") : mode === "signup" ? t(lang, "createAccount") : t(lang, "logIn")}
        </button>
        <p className="page-sub">{t(lang, "registerHint")}</p>
      </form>
    </div>
  );
}
