import { useState } from "react";
import { PixelButton, PixelSelect } from "@pxlkit/ui-kit";
import useGameStore from "../../stores/gameStore.js";
import useUiStore from "../../stores/uiStore.js";
import useFocusStore from "../../stores/focusStore.js";
import { useT } from "../../i18n/index.js";
import PixelIcon from "../shared/PixelIcon.jsx";
import styles from "./ActionBar.module.css";

const LOUNGE_STATUSES = ["resting", "chatting", "listening", "watching", "napping", "snacking", "browsing", "wandering", "daydreaming"];

function formatTimer(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActionBar() {
  const t = useT();
  const room = useGameStore((s) => s.room);
  const isFocusing = useFocusStore((s) => s.isFocusing);
  const elapsed = useFocusStore((s) => s.elapsed);
  const focusTaskName = useFocusStore((s) => s.focusTaskName);
  const setFocusPopupOpen = useUiStore((s) => s.setFocusPopupOpen);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);

  const statuses = LOUNGE_STATUSES;
  const [currentStatus, setCurrentStatus] = useState("resting");

  const handleStatusChange = (val) => {
    setCurrentStatus(val);
    if (window.__onStatusChange) window.__onStatusChange(val);
  };

  const handleFocusToggle = () => {
    if (isFocusing) {
      if (window.__onFocusEnd) window.__onFocusEnd();
      useFocusStore.getState().endFocus();
    } else {
      setFocusPopupOpen(true);
    }
  };

  return (
    <nav className={styles.bar} aria-label="Actions">
      {room === "rest" && !isFocusing && (
        <PixelSelect
          value={currentStatus}
          onChange={handleStatusChange}
          options={statuses.map((s) => ({ value: s, label: t(s) || s }))}
          tone="gold"
          size="sm"
        />
      )}

      {room === "focus" && (
        <PixelButton
          variant="ghost"
          tone={isFocusing ? "red" : "gold"}
          size="sm"
          onClick={handleFocusToggle}
        >
          {isFocusing ? t("endFocus") : t("startFocus")}
        </PixelButton>
      )}

      {isFocusing && (
        <output className={styles.timerDisplay}>
          {focusTaskName && <span className={styles.taskLabel}>{focusTaskName}</span>}
          <time className={styles.timeValue}>{formatTimer(elapsed)}</time>
        </output>
      )}

      {room === "focus" && !isFocusing && (
        <PixelButton variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
          <PixelIcon name="chart" />
        </PixelButton>
      )}
    </nav>
  );
}
