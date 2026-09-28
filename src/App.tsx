import { useState } from "react";
import { GameTabs, type Tab } from "./components/GameTabs";
import { Header } from "./components/Header";
import { Modal, type ModalName } from "./components/Modal";
import { GiveUpModal } from "./components/modals/GiveUpModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ResetModal } from "./components/modals/ResetModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { TitleModal } from "./components/modals/TitleModal";
import { PlayPanel } from "./components/play/PlayPanel";
import { RecordPanel } from "./components/RecordPanel";
import { useModelContextTools } from "./hooks/useModelContextTools";
import { useTheme } from "./theme";

export function App() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("play");
  const [modal, setModal] = useState<ModalName | null>(null);
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
          <GameTabs active={activeTab} onChange={setActiveTab} />
          <PlayPanel hidden={activeTab !== "play"} onOpenModal={setModal} />
          <RecordPanel
            hidden={activeTab !== "record"}
            onReset={() => setModal("reset")}
          />
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
