import { useState } from "react";
import { PixelModal, PixelInput, PixelButton, PixelSegmented } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import useFocusStore from "../../stores/focusStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./FocusPopup.module.css";

const CATEGORIES = [
  { key: "working", i18nKey: "catWorking" },
  { key: "studying", i18nKey: "catStudying" },
  { key: "reading", i18nKey: "catReading" },
  { key: "writing", i18nKey: "catWriting" },
  { key: "creating", i18nKey: "catCreating" },
  { key: "exercising", i18nKey: "catExercising" },
];

export default function FocusPopup() {
  const t = useT();
  const setFocusPopupOpen = useUiStore((s) => s.setFocusPopupOpen);
  const startFocus = useFocusStore((s) => s.startFocus);

  const [category, setCategory] = useState("working");
  const [taskName, setTaskName] = useState("");

  const handleStart = () => {
    startFocus(category, taskName);
    if (window.__onFocusStart) {
      window.__onFocusStart(category, taskName);
    }
    setFocusPopupOpen(false);
  };

  return (
    <PixelModal
      open={true}
      title={t("focusPopupTitle")}
      onClose={() => setFocusPopupOpen(false)}
      size="sm"
    >
      <div className={styles.categories}>
        <PixelSegmented
          value={category}
          onChange={setCategory}
          options={CATEGORIES.map((c) => ({ value: c.key, label: t(c.i18nKey) }))}
          tone="gold"
        />
      </div>
      <div className={styles.taskRow}>
        <PixelInput
          placeholder={t("taskPlaceholder")}
          maxLength={50}
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          tone="gold"
          size="sm"
        />
      </div>
      <div className={styles.actions}>
        <PixelButton tone="gold" onClick={handleStart}>
          {t("start")}
        </PixelButton>
        <PixelButton variant="ghost" onClick={() => setFocusPopupOpen(false)}>
          {t("cancel")}
        </PixelButton>
      </div>
    </PixelModal>
  );
}
