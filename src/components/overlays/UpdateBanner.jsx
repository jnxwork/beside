import { useT } from "../../i18n/index.js";
import styles from "./UpdateBanner.module.css";

export default function UpdateBanner() {
  const t = useT();
  return (
    <div className={styles.banner}>
      <span className={styles.text}>{t("updateReady")}</span>
      <button className={styles.btn} onClick={() => location.reload()}>
        {t("updateBtn")}
      </button>
    </div>
  );
}
