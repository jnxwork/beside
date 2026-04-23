import { PixelButton } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./LoadingOverlay.module.css";

export default function LoadingOverlay() {
  const t = useT();
  const text = useUiStore((s) => s.loadingText);
  const error = useUiStore((s) => s.loadingError);

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.inner}>
        {!error && <div className={styles.spinner} />}
        <p className={styles.text}>{text}</p>
        {error && (
          <PixelButton tone="gold" onClick={() => window.location.reload()}>
            Refresh
          </PixelButton>
        )}
      </div>
    </div>
  );
}
