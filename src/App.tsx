import { useCallback, useEffect, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { IconContext } from "@phosphor-icons/react";
import { beforeSend } from "./analytics";
import { AchievementToast } from "./components/AchievementToast";
import { Toaster } from "./components/Toaster";
import { CustomPanel } from "./components/custom/CustomPanel";
import { GameTabs, TAB_ORDER, type Tab } from "./components/GameTabs";
import { Header } from "./components/Header";
import { Modal, type ModalName } from "./components/Modal";
import { NewsPanel } from "./components/NewsPanel";
import { GiveUpModal } from "./components/modals/GiveUpModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ResetModal } from "./components/modals/ResetModal";
import { RecordShareModal } from "./components/modals/RecordShareModal";
import { ShareModal } from "./components/modals/ShareModal";
import { SharedModal } from "./components/modals/SharedModal";
import { NicknameModal } from "./components/modals/NicknameModal";
import { ReportModal } from "./components/modals/ReportModal";
import { AccountModal } from "./components/modals/AccountModal";
import { TutorialModal } from "./components/modals/TutorialModal";
import { PlayOptionsModal } from "./components/modals/PlayOptionsModal";
import { QuestionMenuModal } from "./components/modals/QuestionMenuModal";
import { DailyPanel } from "./components/play/DailyPanel";
import { PlayPanel } from "./components/play/PlayPanel";
import { RecordPanel } from "./components/RecordPanel";
import { useModelContextTools } from "./hooks/useModelContextTools";
import { useNewsSeen } from "./hooks/useNewsSeen";
import { news, questions } from "./game";
import { useAccount } from "./account";
import { useCollectionSeen } from "./collectionSeen";
import { toast } from "./toast";
import { koreaDate } from "./daily";
import { useRanking } from "./ranking";
import { parseSharedLink } from "./share";
import { replacesProgress, useGame } from "./store";
import { useTextSize } from "./textSize";
import { useTheme } from "./theme";
import { isNewPlayer, tutorialDone } from "./tutorial";

const LINE_ICONS = { weight: "regular" } as const;

/** The top bar's screen name; the play tab shows the brand instead. */
const TAB_TITLES: Record<Tab, string | undefined> = {
  play: undefined,
  daily: "데일리 퀴즈",
  custom: "내 가사",
  record: "기록",
  news: "새 소식",
};

export function App() {
  const { theme, setTheme } = useTheme();
  const { size: textSize, setSize: setTextSize } = useTextSize();
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("today") === "1"
      ? "daily"
      : "play",
  );
  // A same-question link (?q=문제ID&mode=모드); asks first if it would replace a round in progress.
  const [shared] = useState(() => {
    const link = parseSharedLink(window.location.href);
    if (!link) return null;
    // An old link to a question a publish removed: just say so.
    const missing = !questions.some((q) => q.id === link.id);
    return {
      ...link,
      missing,
      confirm:
        !missing && replacesProgress(useGame.getState(), link.id, link.mode),
    };
  });
  const [modal, setModalName] = useState<ModalName | null>(() =>
    shared?.confirm
      ? "shared"
      : !tutorialDone() && isNewPlayer(useGame.getState())
        ? "tutorial"
        : null,
  );
  const [today, setToday] = useState(koreaDate);
  const syncDaily = useGame((s) => s.syncDaily);
  // Today's daily is still open: mark its tab until it's solved or given up.
  const dailyOpen = useGame(
    (s) => !s.daily.round.solved && !s.daily.round.givenUp,
  );
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
  // Account sync runs out of sight: its failures come up as a toast.
  const accountError = useAccount((s) => s.error);
  useEffect(() => {
    if (accountError) toast(accountError, { error: true });
  }, [accountError]);
  // Songs guessed since the 도감 was last opened put a dot on the 기록 tab.
  const collectedCount = useGame((s) => s.collected.length);
  const collectionSeen = useCollectionSeen((s) => s.seen);
  useEffect(() => {
    useCollectionSeen.getState().startFrom(useGame.getState().collected.length);
  }, []);
  useEffect(() => {
    // After a reset there are fewer songs than were seen: start counting again from there.
    if (collectedCount < collectionSeen)
      useCollectionSeen.getState().markSeen(collectedCount);
  }, [collectedCount, collectionSeen]);
  // A new tab starts at its top (sliding in from its side); pressing the current tab again
  // scrolls back up.
  const [tabDir, setTabDir] = useState<"forward" | "back">("forward");
  const changeTab = (tab: Tab) => {
    if (tab === activeTab) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTabDir(
      TAB_ORDER.indexOf(tab) < TAB_ORDER.indexOf(activeTab)
        ? "back"
        : "forward",
    );
    setActiveTab(tab);
    window.scrollTo(0, 0);
    if (tab === "news") markSeen();
  };
  // A clear sideways swipe moves to the next or previous tab (not from inputs or rows that
  // scroll sideways themselves).
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_MIN = 70;
  // Closing first slides the sheet down (Modal), and only then clears what it shows.
  const [closing, setClosing] = useState(false);
  const setModal = (name: ModalName | null) => {
    setClosing(false);
    setModalName(name);
  };
  const close = () => setClosing(true);
  const closed = useCallback(() => {
    setClosing(false);
    setModalName(null);
  }, []);
  // The first daily title guess asks for a ranking nickname (once, skippable).
  const afterDailySolve = () => {
    const { nickname, asked } = useRanking.getState();
    if (!nickname && !asked) setModal("nickname");
  };
  // The link applies once: clean the URL so a refresh doesn't open it again.
  useEffect(() => {
    if (!shared) return;
    if (shared.missing)
      useGame.setState({
        notice: "공유받은 문제는 더 이상 없어요. 지금 문제를 풀어 보세요.",
      });
    else if (!shared.confirm)
      useGame.getState().openQuestion(shared.id, shared.mode);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url.href);
  }, [shared]);
  useModelContextTools();
  return (
    // Every game icon is a thin line (components/icons.ts).
    <IconContext.Provider value={LINE_ICONS}>
      <div className="app-shell">
        <Header
          title={TAB_TITLES[activeTab]}
          onAccount={() => setModal("account")}
          onShare={
            activeTab === "record" ? () => setModal("record-share") : undefined
          }
        />
        <main
          data-dir={tabDir}
          onTouchStart={(e) => {
            const target = e.target as Element;
            const touch = e.touches[0];
            swipe.current =
              e.touches.length === 1 &&
              !target.closest("input, textarea, .unit-cards, .grass-grid")
                ? { x: touch.clientX, y: touch.clientY }
                : null;
          }}
          onTouchEnd={(e) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start) return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5)
              return;
            const next =
              TAB_ORDER[TAB_ORDER.indexOf(activeTab) + (dx < 0 ? 1 : -1)];
            if (next) changeTab(next);
          }}
        >
          <GameTabs
            active={activeTab}
            onChange={changeTab}
            pending={{
              ...(dailyOpen && { daily: "오늘 문제 아직 안 풂" }),
              ...(unread && { news: "새 소식 있음" }),
              ...(collectedCount > collectionSeen && {
                record: "도감에 새 곡",
              }),
            }}
          />
          <PlayPanel hidden={activeTab !== "play"} onOpenModal={setModal} />
          <DailyPanel
            hidden={activeTab !== "daily"}
            onOpenModal={setModal}
            onSolve={afterDailySolve}
          />
          <CustomPanel hidden={activeTab !== "custom"} />
          <RecordPanel
            hidden={activeTab !== "record"}
            onReset={() => setModal("reset")}
            onPlay={() => changeTab("play")}
            onDaily={() => changeTab("daily")}
          />
          <NewsPanel hidden={activeTab !== "news"} />
        </main>
        <AchievementToast />
        <Toaster />
        {/* Page-view statistics; the admin page doesn't include this. */}
        <Analytics beforeSend={beforeSend} />
      </div>
      <Modal
        open={modal !== null}
        closing={closing}
        onClose={close}
        onClosed={closed}
      >
        {modal === "play-options" && <PlayOptionsModal onClose={close} />}
        {modal === "menu" && (
          <QuestionMenuModal
            onGiveUp={() => setModal("giveup")}
            onReport={() => setModal("report")}
          />
        )}
        {modal === "daily-menu" && (
          <QuestionMenuModal
            mode="daily"
            onGiveUp={() => setModal("daily-giveup")}
            onReport={() => setModal("daily-report")}
          />
        )}
        {modal === "account" && (
          <AccountModal
            theme={theme}
            onThemeChange={setTheme}
            textSize={textSize}
            onTextSizeChange={setTextSize}
            onHelp={() => setModal("help")}
            onReport={() => setModal("general-report")}
          />
        )}
        {modal === "report" && <ReportModal mode="play" onClose={close} />}
        {modal === "daily-report" && (
          <ReportModal mode="daily" onClose={close} />
        )}
        {modal === "general-report" && <ReportModal onClose={close} />}
        {modal === "share" && <ShareModal />}
        {modal === "daily-share" && <ShareModal mode="daily" />}
        {modal === "record-share" && <RecordShareModal />}
        {modal === "nickname" && <NicknameModal onClose={close} />}
        {modal === "help" && (
          <HelpModal onClose={close} onTutorial={() => setModal("tutorial")} />
        )}
        {modal === "tutorial" && (
          <TutorialModal
            onClose={close}
            onStart={() => {
              changeTab("play");
              close();
            }}
          />
        )}
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
    </IconContext.Provider>
  );
}
