import { PixelModal, PixelButton } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./PortalConfirm.module.css";

export default function PortalConfirm() {
  const t = useT();
  const setPortalConfirmOpen = useUiStore((s) => s.setPortalConfirmOpen);

  const handleYes = () => {
    if (window.__onPortalConfirmYes) window.__onPortalConfirmYes();
    setPortalConfirmOpen(false);
  };

  const handleNo = () => {
    if (window.__onPortalConfirmNo) window.__onPortalConfirmNo();
    setPortalConfirmOpen(false);
  };

  return (
    <PixelModal
      open={true}
      title={t("portalConfirmTitle")}
      onClose={handleNo}
      size="sm"
    >
      <div className={styles.actions}>
        <PixelButton tone="gold" onClick={handleYes}>
          {t("portalConfirmYes")}
        </PixelButton>
        <PixelButton variant="ghost" onClick={handleNo}>
          {t("portalConfirmNo")}
        </PixelButton>
      </div>
    </PixelModal>
  );
}
