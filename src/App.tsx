import { useState } from "react";
import { Footer } from "./components/Footer";
import { GameTabs, type Tab } from "./components/GameTabs";
import { Header } from "./components/Header";
import { Modal, type ModalName } from "./components/Modal";
import { NewsPanel } from "./components/NewsPanel";
import { GiveUpModal } from "./components/modals/GiveUpModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ResetModal } from "./components/modals/ResetModal";
import { ThemeModal } from "./components/modals/ThemeModal";
import { TitleModal } from "./components/modals/TitleModal";
import { UnitModal } from "./components/modals/UnitModal";
import { PlayPanel } from "./components/play/PlayPanel";
import { RecordPanel } from "./components/RecordPanel";
import { useModelContextTools } from "./hooks/useModelContextTools";
import { useNewsSeen } from "./hooks/useNewsSeen";
import { news } from "./game";
import { useTheme } from "./theme";

export function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("play");
  const [modal, setModal] = useState<ModalName | null>(null);
  const { unread, markSeen } = useNewsSeen(news[0]?.id ?? 0);
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "news") markSeen();
  };
  const close = () => setModal(null);
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
          onTheme={() => setModal("theme")}
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
          <RecordPanel
            hidden={activeTab !== "record"}
            onReset={() => setModal("reset")}
          />
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
        {modal === "units" && <UnitModal onClose={close} />}
        {modal === "theme" && (
          <ThemeModal theme={theme} onThemeChange={setTheme} onClose={close} />
        )}
        {modal === "help" && <HelpModal onClose={close} />}
        {modal === "giveup" && <GiveUpModal onClose={close} />}
        {modal === "reset" && <ResetModal onClose={close} onCancel={close} />}
      </Modal>
    </>
  );
}
