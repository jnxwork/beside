import useUiStore from "./stores/uiStore.js";
import useGameStore from "./stores/gameStore.js";

// Overlays
import LoadingOverlay from "./components/overlays/LoadingOverlay.jsx";
import RotateOverlay from "./components/overlays/RotateOverlay.jsx";

// Popups
import WelcomePopup from "./components/popups/WelcomePopup.jsx";
import WelcomePopupRC from "./components/popups/WelcomePopup.resident-card.jsx";
import AuthPopup from "./components/popups/AuthPopup.jsx";
import FocusPopup from "./components/popups/FocusPopup.jsx";
import PortalConfirm from "./components/popups/PortalConfirm.jsx";
import HistoryPopup from "./components/popups/HistoryPopup.jsx";
import BulletinPopup from "./components/popups/BulletinPopup.jsx";
import RecapPopup from "./components/popups/RecapPopup.jsx";

// Panels
import InfoPanel from "./components/panels/InfoPanel.jsx";
import SettingsPanel from "./components/panels/SettingsPanel.jsx";
import ActionBar from "./components/panels/ActionBar.jsx";

// Chat
import ChatPanel from "./components/chat/ChatPanel.jsx";

// Player
import PlayerCard from "./components/player/PlayerCard.jsx";
import OverlapSelector from "./components/player/OverlapSelector.jsx";

// Overlays (minor)
import Hints from "./components/overlays/Hints.jsx";

const useResidentCard = new URLSearchParams(window.location.search).get("welcome") !== "legacy";
const Welcome = useResidentCard ? WelcomePopupRC : WelcomePopup;

export default function App() {
  const loading = useUiStore((s) => s.loading);
  const welcomeOpen = useUiStore((s) => s.welcomeOpen);
  const authOpen = useUiStore((s) => s.authOpen);
  const focusPopupOpen = useUiStore((s) => s.focusPopupOpen);
  const portalConfirmOpen = useUiStore((s) => s.portalConfirmOpen);
  const historyOpen = useUiStore((s) => s.historyOpen);
  const bulletinOpen = useUiStore((s) => s.bulletinOpen);
  const recapOpen = useUiStore((s) => s.recapOpen);
  const playerCardTarget = useUiStore((s) => s.playerCardTarget);
  const overlapTarget = useUiStore((s) => s.overlapSelectorTarget);
  const room = useGameStore((s) => s.room);

  return (
    <>
      {/* Always-visible panels */}
      <InfoPanel />
      <SettingsPanel />
      <ActionBar />
      {room === "rest" && <ChatPanel />}
      <Hints />

      {/* Conditional popups */}
      {loading && <LoadingOverlay />}
      <RotateOverlay />
      {welcomeOpen && <Welcome />}
      {authOpen && <AuthPopup />}
      {focusPopupOpen && <FocusPopup />}
      {portalConfirmOpen && <PortalConfirm />}
      {historyOpen && <HistoryPopup />}
      {bulletinOpen && <BulletinPopup />}
      {recapOpen && <RecapPopup />}
      {playerCardTarget && <PlayerCard />}
      {overlapTarget && <OverlapSelector />}
    </>
  );
}
