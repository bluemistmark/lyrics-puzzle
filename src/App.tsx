import { useEffect, useState } from "react";
import { CollectionPanel } from "./components/CollectionPanel";
import { Footer } from "./components/Footer";
import { GameTabs, type Tab } from "./components/GameTabs";
import { Header } from "./components/Header";
import { Modal, type ModalName } from "./components/Modal";
import { NewsPanel } from "./components/NewsPanel";
import { GiveUpModal } from "./components/modals/GiveUpModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ResetModal } from "./components/modals/ResetModal";
import { NicknameModal } from "./components/modals/NicknameModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { TitleModal } from "./components/modals/TitleModal";
import { UnitModal } from "./components/modals/UnitModal";
import { DailyPanel } from "./components/play/DailyPanel";
import { PlayPanel } from "./components/play/PlayPanel";
import { RecordPanel } from "./components/RecordPanel";
import { useModelContextTools } from "./hooks/useModelContextTools";
import { useNewsSeen } from "./hooks/useNewsSeen";
import { news } from "./game";
import { koreaDate } from "./daily";
import { useRanking } from "./ranking";
import { useGame } from "./store";
import { useTheme } from "./theme";

export function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("today") === "1"
      ? "daily"
      : "play",
  );
  const [modal, setModal] = useState<ModalName | null>(null);
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
          onHelp={() => setModal("help")}
          onSettings={() => setModal("settings")}
        />
        <main>
          {theme === "console" && (
            <div className="console-screen-label" aria-hidden="true">
              <span className="console-power">● POWER</span>
              <span>LYRICS QUEST</span>
              <span>★ 01</span>
            </div>
          )}
          <GameTabs
            active={activeTab}
            onChange={changeTab}
            dots={{ news: unread && activeTab !== "news" }}
          />
          <PlayPanel hidden={activeTab !== "play"} onOpenModal={setModal} />
          <DailyPanel hidden={activeTab !== "daily"} onOpenModal={setModal} />
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
      </div>
      <Modal open={modal !== null} onClose={close}>
        {modal === "title" && <TitleModal onClose={close} />}
        {modal === "daily-title" && (
          <TitleModal onClose={afterDailySolve} mode="daily" />
        )}
        {modal === "units" && <UnitModal onClose={close} />}
        {modal === "settings" && (
          <SettingsModal
            theme={theme}
            onThemeChange={setTheme}
            onClose={close}
          />
        )}
        {modal === "nickname" && <NicknameModal onClose={close} />}
        {modal === "help" && <HelpModal onClose={close} />}
        {modal === "giveup" && <GiveUpModal onClose={close} />}
        {modal === "daily-giveup" && (
          <GiveUpModal onClose={close} mode="daily" />
        )}
        {modal === "reset" && <ResetModal onClose={close} onCancel={close} />}
      </Modal>
    </>
  );
}
