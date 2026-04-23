import { useRef, useEffect } from "react";
import useUiStore from "../../stores/uiStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./OverlapSelector.module.css";

export default function OverlapSelector() {
  const t = useT();
  const target = useUiStore((s) => s.overlapSelectorTarget);
  const setTarget = useUiStore((s) => s.setOverlapSelectorTarget);
  const setPlayerCard = useUiStore((s) => s.setPlayerCardTarget);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setTarget(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setTarget]);

  if (!target?.players?.length) return null;

  const style = {};
  if (target.x != null) {
    style.left = target.x;
    style.top = target.y;
  }

  return (
    <div className={styles.selector} ref={ref} style={style} role="menu">
      <div className={styles.title}>{t("selectPlayer")}</div>
      {target.players.map((p) => (
        <button
          key={p.id}
          className={styles.item}
          role="menuitem"
          onClick={() => {
            setTarget(null);
            setPlayerCard({ id: p.id, x: target.x, y: target.y });
          }}
        >
          <canvas
            className={styles.avatar}
            width={22}
            height={22}
            id={`overlap-avatar-${p.id}`}
          />
          <span className={styles.name}>{p.name}</span>
        </button>
      ))}
    </div>
  );
}
