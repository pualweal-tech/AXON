import { BottomNav } from "./ui";
import { ActionsScreen } from "./screens/Actions";
import { ChatScreen } from "./screens/Chat";
import { Auth, Splash } from "./screens/Entry";
import { MemoryScreen } from "./screens/Memory";
import { Overlays } from "./screens/Overlays";
import { ProfileScreen } from "./screens/Profile";
import { WeeklyPlanScreen } from "./screens/WeeklyPlan";
import { WorkspaceScreen } from "./screens/Workspace";
import { useStore } from "./store";
import { t } from "./i18n";

export function App() {
  const { data, ui } = useStore();

  if (ui.screen.id === "splash") return <Splash />;
  if (ui.screen.id === "auth") return <Auth />;

  const overlay = ui.overlay;

  return (
    <>
      {overlay.name === "weekly-plan" ? (
        <WeeklyPlanScreen planId={overlay.planId} />
      ) : overlay.name === "memory" ? (
        <MemoryScreen />
      ) : ui.tab === "actions" ? (
        <ActionsScreen />
      ) : ui.tab === "workspace" ? (
        <WorkspaceScreen />
      ) : ui.tab === "profile" ? (
        <ProfileScreen />
      ) : (
        <ChatScreen />
      )}
      <BottomNav />
      <Overlays />
      {ui.toast && (
        <div className="toast" key={ui.toast.key}>
          {ui.toast.text}
        </div>
      )}
      {ui.generating && overlay.name !== "weekly-plan" && overlay.name !== "multimodal" && (
        <div className="overlay" style={{ alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ margin: 24, textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            {t(data.lang, "generating")}
          </div>
        </div>
      )}
    </>
  );
}
