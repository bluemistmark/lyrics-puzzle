import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { beforeSend } from "./analytics";
import { AchievementToast } from "./components/AchievementToast";
import { CollectionPanel } from "./components/CollectionPanel";
import { CustomPanel } from "./components/custom/CustomPanel";
import { Footer } from "./components/Footer";
import { GameTabs, type Tab } from "./components/GameTabs";
import { Header } from "./components/Header";
import { Modal, type ModalName } from "./components/Modal";
import { NewsPanel } from "./components/NewsPanel";
import { GiveUpModal } from "./components/modals/GiveUpModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ResetModal } from "./components/modals/ResetModal";
import { SharedModal } from "./components/modals/SharedModal";
import { NicknameModal } from "./components/modals/NicknameModal";
import { ReportModal } from "./components/modals/ReportModal";
import { AccountModal } from "./components/modals/AccountModal";
import { ThemeModal } from "./components/modals/ThemeModal";
import { TitleModal } from "./components/modals/TitleModal";
import { ModeModal } from "./components/modals/ModeModal";
import { UnitModal } from "./components/modals/UnitModal";
import { DailyPanel } from "./components/play/DailyPanel";
import { PlayPanel } from "./components/play/PlayPanel";
import { RecordPanel } from "./components/RecordPanel";
import { useModelContextTools } from "./hooks/useModelContextTools";
import { useNewsSeen } from "./hooks/useNewsSeen";
import { news } from "./game";
import { koreaDate } from "./daily";
import { useRanking } from "./ranking";
import { parseSharedLink } from "./share";
import { replacesProgress, useGame } from "./store";
import { useTheme } from "./theme";

export function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("today") === "1"
      ? "daily"
      : "play",
  );
  // A same-question link (?q=문제ID&mode=모드); asks first if it would replace a round in progress.
  const [shared] = useState(() => {
    const link = parseSharedLink(window.location.href);
    return (
      link && {
        ...link,
        confirm: replacesProgress(useGame.getState(), link.id, link.mode),
      }
    );
  });
  const [modal, setModal] = useState<ModalName | null>(() =>
    shared?.confirm ? "shared" : null,
  );
  const [today, setToday] = useState(koreaDate);
  const syncDaily = useGame((s) => s.syncDaily);
  useEffect(() => {
    const refresh = () => setToday(koreaDate());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => syncDaily(today), [syncDaily, today]);
  // Remember every theme choice for the 업적 "패셔니스타".
  const noteTheme = useGame((s) => s.noteTheme);
  useEffect(() => noteTheme(theme), [noteTheme, theme]);
  const { unread, markSeen } = useNewsSeen(news[0]?.id ?? 0);
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "news") markSeen();
  };
  const close = () => setModal(null);
  // The first daily title guess asks for a ranking nickname (once, skippable).
  const afterDailySolve = () => {
    const { nickname, asked } = useRanking.getState();
    setModal(nickname || asked ? null : "nickname");
  };
  // The link applies once: clean the URL so a refresh doesn't open it again.
  useEffect(() => {
    if (!shared) return;
    if (!shared.confirm)
      useGame.getState().openQuestion(shared.id, shared.mode);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url.href);
  }, [shared]);
  useModelContextTools();
  return (
    <>
      {theme === "excel" && (
        <div className="sheet-grid" aria-hidden="true">
          <div className="sheet-corner" />
          <div className="sheet-columns">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
              <span key={letter}>{letter}</span>
            ))}
          </div>
          <div className="sheet-rows">
            {Array.from({ length: 60 }, (_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
        </div>
      )}
      <div className="app-shell">
        <Header
          discreet={theme === "excel"}
          newsOpen={activeTab === "news"}
          newsUnread={unread && activeTab !== "news"}
          onNews={() => changeTab(activeTab === "news" ? "play" : "news")}
          onHelp={() => setModal("help")}
          onTheme={() => setModal("theme")}
          onAccount={() => setModal("account")}
        />
        <main>
          {theme === "console" && (
            <div className="console-screen-label" aria-hidden="true">
              <span className="console-power">● POWER</span>
              <span>LYRICS QUEST</span>
              <span>★ 01</span>
            </div>
          )}
          <GameTabs active={activeTab} onChange={changeTab} />
          <PlayPanel hidden={activeTab !== "play"} onOpenModal={setModal} />
          <DailyPanel hidden={activeTab !== "daily"} onOpenModal={setModal} />
          <CustomPanel hidden={activeTab !== "custom"} />
          <RecordPanel
            hidden={activeTab !== "record"}
            onReset={() => setModal("reset")}
          />
          <CollectionPanel hidden={activeTab !== "collection"} />
          <NewsPanel hidden={activeTab !== "news"} />
        </main>
        {theme === "console" && (
          <div className="console-controls" aria-hidden="true">
            <div className="console-dpad">
              <span className="console-dpad-up" />
              <span className="console-dpad-left" />
              <span className="console-dpad-center" />
              <span className="console-dpad-right" />
              <span className="console-dpad-down" />
            </div>
            <div className="console-start">SELECT&nbsp;&nbsp; START</div>
            <div className="console-ab">
              <span>B</span>
              <span>A</span>
            </div>
          </div>
        )}
        <Footer />
        <AchievementToast />
        {/* Page-view statistics; the admin page doesn't include this. */}
        <Analytics beforeSend={beforeSend} />
      </div>
      <Modal open={modal !== null} onClose={close}>
        {modal === "title" && <TitleModal onClose={close} />}
        {modal === "daily-title" && (
          <TitleModal onClose={afterDailySolve} mode="daily" />
        )}
        {modal === "units" && <UnitModal onClose={close} />}
        {modal === "modes" && <ModeModal onClose={close} />}
        {modal === "theme" && (
          <ThemeModal theme={theme} onThemeChange={setTheme} onClose={close} />
        )}
        {modal === "account" && (
          <AccountModal onReport={() => setModal("general-report")} />
        )}
        {modal === "report" && <ReportModal mode="play" onClose={close} />}
        {modal === "daily-report" && (
          <ReportModal mode="daily" onClose={close} />
        )}
        {modal === "general-report" && <ReportModal onClose={close} />}
        {modal === "nickname" && <NicknameModal onClose={close} />}
        {modal === "help" && <HelpModal onClose={close} />}
        {modal === "giveup" && <GiveUpModal onClose={close} />}
        {modal === "daily-giveup" && (
          <GiveUpModal onClose={close} mode="daily" />
        )}
        {modal === "reset" && <ResetModal onClose={close} onCancel={close} />}
        {modal === "shared" && shared && (
          <SharedModal
            mode={shared.mode}
            onOpen={() => {
              useGame.getState().openQuestion(shared.id, shared.mode);
              changeTab("play");
              close();
            }}
            onKeep={close}
          />
        )}
      </Modal>
    </>
  );
}
