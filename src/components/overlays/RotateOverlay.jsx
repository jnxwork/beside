import styles from "./RotateOverlay.module.css";

export default function RotateOverlay() {
  return (
    <div className={styles.overlay} role="alert">
      <span className={styles.icon} aria-hidden="true">📱</span>
      <p className={styles.text}>Please rotate your device to landscape</p>
      <p className={styles.textSm}>请横屏使用</p>
    </div>
  );
}
