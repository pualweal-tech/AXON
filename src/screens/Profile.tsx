import { t } from "../i18n";
import { AxonMark, IconChevron } from "../icons";
import { useStore } from "../store";
import type { Overlay } from "../types";

export function ProfileScreen() {
  const { data, setOverlay, logout } = useStore();
  const lang = data.lang;
  const rows: { label: string; overlay: Overlay }[] = [
    { label: t(lang, "appearance"), overlay: { name: "appearance" } },
    { label: t(lang, "language"), overlay: { name: "language" } },
    { label: t(lang, "notifications"), overlay: { name: "notifications" } },
    { label: t(lang, "aiPrefs"), overlay: { name: "ai-prefs" } },
    { label: t(lang, "memory"), overlay: { name: "memory" } },
    { label: t(lang, "about"), overlay: { name: "about" } },
  ];

  return (
    <div className="screen">
      <header className="topbar">
        <div className="page-title">{t(lang, "profile")}</div>
      </header>
      <div className="screen-body">
        <button className="card press" style={{ width: "100%", textAlign: "left" }} onClick={() => setOverlay({ name: "account" })}>
          <div className="row">
            <AxonMark size={48} />
            <div>
              <b>{t(lang, "axon")}</b>
              <div className="page-sub">{t(lang, "signedIn")}</div>
            </div>
          </div>
        </button>
        <div className="card" style={{ marginTop: 16, padding: "4px 16px" }}>
          {rows.map((row) => (
            <button key={row.label} className="setting-row press" onClick={() => setOverlay(row.overlay)}>
              <span>{row.label}</span>
              <IconChevron />
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-block" style={{ marginTop: 24 }} onClick={logout}>
          {t(lang, "logOut")}
        </button>
      </div>
    </div>
  );
}
