import { useState } from "react";
import { GameTabs, type Tab } from "./components/GameTabs";
import { Header } from "./components/Header";
import { Modal, type ModalName } from "./components/Modal";
import { NewsPanel } from "./components/NewsPanel";
import { GiveUpModal } from "./components/modals/GiveUpModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ResetModal } from "./components/modals/ResetModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { TitleModal } from "./components/modals/TitleModal";
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
      <div className="app-shell">
        <Header
          onHelp={() => setModal("help")}
          onSettings={() => setModal("settings")}
        />
        <main>
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
      </div>
      <Modal open={modal !== null} onClose={close}>
        {modal === "title" && <TitleModal onClose={close} />}
        {modal === "settings" && (
          <SettingsModal
            theme={theme}
            onThemeChange={setTheme}
            onClose={close}
          />
        )}
        {modal === "help" && <HelpModal onClose={close} />}
        {modal === "giveup" && <GiveUpModal onClose={close} />}
        {modal === "reset" && (
          <ResetModal onClose={close} onCancel={() => setModal("settings")} />
        )}
      </Modal>
    </>
  );
}
