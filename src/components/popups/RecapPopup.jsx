import { useState, useEffect } from "react";
import { PixelModal, PixelButton } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./RecapPopup.module.css";

export default function RecapPopup() {
  const t = useT();
  const setRecapOpen = useUiStore((s) => s.setRecapOpen);
  const [data, setData] = useState(null);

  useEffect(() => {
    window.__setRecapData = setData;
    return () => { delete window.__setRecapData; };
  }, []);

  return (
    <PixelModal
      open={true}
      title={t("recapTitle")}
      onClose={() => setRecapOpen(false)}
      size="sm"
    >
      {data?.dateRange && (
        <div className={styles.dateRange}>{data.dateRange}</div>
      )}
      <div className={styles.body}>
        {!data && <div className={styles.noData}>{t("recapNoData")}</div>}
        {data?.items && (
          <dl className={styles.dl}>
            {data.items.map((item, i) => (
              <div key={i} className={styles.row}>
                <dt className={styles.rowLabel}>{item.label}</dt>
                <dd className={styles.rowValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className={styles.actions}>
        <PixelButton variant="ghost" onClick={() => setRecapOpen(false)}>
          {t("recapClose")}
        </PixelButton>
      </div>
    </PixelModal>
  );
}
