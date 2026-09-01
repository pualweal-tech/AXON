import { useEffect, useState } from "react";
import { t } from "../i18n";
import { AxonMark, IconGoogle } from "../icons";
import { useStore } from "../store";

export function Splash() {
  const { skipSplash } = useStore();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 2200);
    const done = window.setTimeout(skipSplash, 2600);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const { data, login } = useStore();
  const lang = data.lang;
  return (
    <div className="auth">
      <AxonMark size={64} />
      <h1>{t(lang, "axon")}</h1>
      <p className="page-sub">{t(lang, "tagline")}</p>
      <div style={{ marginTop: "auto", display: "grid", gap: 12, paddingTop: 48 }}>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{t(lang, "emailHint")}</p>
        <button className="btn btn-primary btn-block" onClick={login}>
          {t(lang, "continueEmail")}
        </button>
        <button className="btn btn-secondary btn-block" onClick={login}>
          <IconGoogle />
          {t(lang, "continueGoogle")}
        </button>
        <button className="btn btn-secondary btn-block" onClick={login}>
          {t(lang, "signUp")}
        </button>
        <button className="btn btn-ghost btn-block" onClick={login}>
          {t(lang, "logIn")}
        </button>
        <button className="btn btn-ghost btn-block" onClick={login}>
          {t(lang, "guest")}
        </button>
      </div>
    </div>
  );
}
