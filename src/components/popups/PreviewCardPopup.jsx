import { useEffect, useRef } from "react";
import { PixelModal, PixelButton } from "@pxlkit/ui-kit";
import { useT } from "../../i18n/index.js";
import styles from "./PreviewCardPopup.module.css";

export default function PreviewCardPopup({ data, onClose }) {
  const t = useT();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || !window.__generateFocusCard) return;

    // Generate card canvas (without downloading)
    const generatedCanvas = window.__generateFocusCard(data, true);

    if (generatedCanvas) {
      // Copy to our display canvas
      const canvas = canvasRef.current;
      canvas.width = generatedCanvas.width;
      canvas.height = generatedCanvas.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(generatedCanvas, 0, 0);
    }
  }, [data]);

  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const filename = `beside-focus-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, "image/png");
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await new Promise((resolve) => {
        canvasRef.current.toBlob(resolve, "image/png");
      });

      if (!blob) throw new Error("Failed to create blob");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);

      // Simple success feedback (you can replace with toast notification)
      console.log("Card copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fall back to download
      handleDownload();
    }
  };

  return (
    <PixelModal
      open={true}
      title={t("previewCardTitle") || "Preview Share Card"}
      onClose={onClose}
      size="lg"
    >
      <div className={styles.preview}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <div className={styles.actions}>
        <PixelButton tone="gold" onClick={handleDownload}>
          {t("downloadCard") || "Download PNG"}
        </PixelButton>
        <PixelButton variant="ghost" onClick={handleCopy}>
          {t("copyCard") || "Copy Image"}
        </PixelButton>
        <PixelButton variant="ghost" onClick={onClose}>
          {t("close") || "Close"}
        </PixelButton>
      </div>
    </PixelModal>
  );
}
