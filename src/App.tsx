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
  const { data, ui, cancel, retrySync, exportData, keepCloud } = useStore();

  if (ui.screen.id === "splash") return <Splash />;
  if (ui.screen.id === "unavailable")
    return (
      <div className="auth">
        <p>
          {data.lang === "zh"
            ? "暂时无法连接工作区"
            : "Workspace connection unavailable"}
        </p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          {data.lang === "zh" ? "重试" : "Retry"}
        </button>
      </div>
    );
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
      {["offline", "conflict", "storage"].includes(ui.sync) && (
        <div className="toast" role="status">
          {data.lang === "zh"
            ? ui.sync === "conflict"
              ? "修改冲突，待合并"
              : "工作区尚未同步"
            : ui.sync === "conflict"
              ? "Conflicting edits"
              : "Workspace not synced"}{" "}
          <button onClick={retrySync}>
            {data.lang === "zh" ? "重试" : "Retry"}
          </button>{" "}
          <button onClick={exportData}>
            {data.lang === "zh" ? "导出" : "Export"}
          </button>{" "}
          {ui.sync === "conflict" && (
            <button
              onClick={() => {
                if (
                  confirm(
                    data.lang === "zh"
                      ? "使用云端版本并丢弃本地待同步修改？"
                      : "Discard pending edits and use the cloud version?",
                  )
                )
                  keepCloud();
              }}
            >
              {data.lang === "zh" ? "使用云端版本" : "Use cloud version"}
            </button>
          )}
        </div>
      )}
      <BottomNav />
      <Overlays />
      {ui.toast && (
        <div className="toast" key={ui.toast.key}>
          {ui.toast.text}
        </div>
      )}
      {ui.generating &&
        overlay.name !== "weekly-plan" &&
        overlay.name !== "multimodal" && (
          <div
            className="overlay"
            style={{ alignItems: "center", justifyContent: "center" }}
          >
            <div className="card" style={{ margin: 24, textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }} />
              {ui.streamText || t(data.lang, "generating")}{" "}
              <button onClick={cancel}>
                {data.lang === "zh" ? "取消" : "Cancel"}
              </button>
            </div>
          </div>
        )}
    </>
  );
}
