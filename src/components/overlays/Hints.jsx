import { useState, useEffect } from "react";
import { useT } from "../../i18n/index.js";
import styles from "./Hints.module.css";

export default function Hints() {
  const t = useT();
  const [autowalkVisible, setAutowalkVisible] = useState(false);
  const [moveHintVisible, setMoveHintVisible] = useState(false);
  const isMobile = "ontouchstart" in window;

  // Expose show/hide to canvas code
  useEffect(() => {
    window.__hints = {
      showAutowalk: () => setAutowalkVisible(true),
      hideAutowalk: () => setAutowalkVisible(false),
      showMoveHint: () => setMoveHintVisible(true),
      hideMoveHint: () => setMoveHintVisible(false),
    };
    return () => { delete window.__hints; };
  }, []);

  return (
    <>
      {autowalkVisible && (
        <output className={styles.autowalk}>{t("goingToRest")}</output>
      )}
      {moveHintVisible && (
        <output className={styles.moveHint}>WASD / ↑↓←→</output>
      )}
    </>
  );
}
