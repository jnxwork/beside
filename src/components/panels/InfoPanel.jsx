import useGameStore from "../../stores/gameStore.js";
import { useT } from "../../i18n/index.js";
import PixelIcon from "../shared/PixelIcon.jsx";
import styles from "./InfoPanel.module.css";

export default function InfoPanel() {
  const t = useT();
  const onlineCount = useGameStore((s) => s.onlineCount);

  return (
    <section className={styles.panel} aria-label="Online status">
      <span className={styles.total}>
        <span className={styles.statusIcon}>
          <PixelIcon name="circle" className={styles.greenDot} />
        </span>
        <span className={styles.count}>{onlineCount.total || 1}</span>
      </span>
      <span className={styles.detail}>
        <span className={styles.sep}>┊</span>
        <span className={`${styles.detailItem} ${styles.focus}`}>
          <PixelIcon name="book-open" className={styles.detailEmoji} />
          <span className={styles.detailText}>Focus:</span>
          <span className={styles.detailCount}>{onlineCount.focus || 0}</span>
        </span>
        <span className={styles.dot}>·</span>
        <span className={`${styles.detailItem} ${styles.lounge}`}>
          <PixelIcon name="coffee" className={styles.detailEmoji} />
          <span className={styles.detailText}>Lounge:</span>
          <span className={styles.detailCount}>{onlineCount.lounge || 0}</span>
        </span>
      </span>
    </section>
  );
}
