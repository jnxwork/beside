import { useState, useRef, useEffect, useLayoutEffect } from "react";
import useUiStore from "../../stores/uiStore.js";
import useGameStore from "../../stores/gameStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./PlayerCard.module.css";
import { PROFESSION_COLORS, TIME_DOT_COLORS } from "../../constants.js";
import PixelIcon from "../shared/PixelIcon.jsx";

const REACTION_EMOJIS = ["👋", "💪", "❤️", "👀"];

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];
function langLabel(code) {
  return LANG_OPTIONS.find((l) => l.code === code)?.label || code;
}

function getTimePeriodKey(h) {
  if (h < 5) return "timeLateNight";
  if (h < 8) return "timeMorning";
  if (h < 11) return "timeForenoon";
  if (h < 13) return "timeNoon";
  if (h < 17) return "timeAfternoon";
  if (h < 19) return "timeDusk";
  return "timeNight";
}

export default function PlayerCard() {
  const t = useT();
  const target = useUiStore((s) => s.playerCardTarget);
  const setTarget = useUiStore((s) => s.setPlayerCardTarget);
  const players = useGameStore((s) => s.players);
  const cardRef = useRef(null);

  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const player = target ? players[target.id] : null;
  const isSelf = target && target.id === localPlayerId;
  const avatarRef = useRef(null);

  // DEV: click timezone to cycle through time periods
  const TIME_KEYS = Object.keys(TIME_DOT_COLORS);
  const [debugTimeIdx, setDebugTimeIdx] = useState(-1); // -1 = real time
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [offlineTip, setOfflineTip] = useState(null); // { x, y, text }
  const offlineTipTimer = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setTarget(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setTarget]);

  // Draw avatar when card opens
  useEffect(() => {
    if (target && avatarRef.current && window.__drawPlayerCardAvatar) {
      window.__drawPlayerCardAvatar(avatarRef.current, target.id);
    }
  }, [target?.id]);

  // Clamp card within viewport after layout
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !target) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;

    // Horizontal: keep card fully visible
    if (rect.left < pad) {
      el.style.left = `${parseFloat(el.style.left) + (pad - rect.left)}px`;
    } else if (rect.right > vw - pad) {
      el.style.left = `${parseFloat(el.style.left) - (rect.right - vw + pad)}px`;
    }

    // Vertical: if clipped at top, flip card below the anchor point
    if (rect.top < pad) {
      el.style.transform = "translate(-50%, 8px)";
    }
  });

  // Check cooldown when card opens for a target
  useEffect(() => {
    if (!target || isSelf) { setCooldownSecs(0); return; }
    const remaining = window.__getReactionCooldown?.(target.id) || 0;
    setCooldownSecs(Math.ceil(remaining / 1000));
  }, [target?.id, isSelf]);

  // Countdown timer
  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const timer = setTimeout(() => setCooldownSecs((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSecs]);

  if (!player) return offlineTip ? (
    <div className={styles.offlineTip} style={{ left: offlineTip.x, top: offlineTip.y }}>
      {offlineTip.text}
    </div>
  ) : null;

  const handleReaction = (emoji) => {
    if (cooldownSecs > 0) return;
    const result = window.__onReaction?.(target.id, emoji);
    if (result?.offline) {
      // Player went offline — close card, show tooltip
      const pos = { x: target.x, y: target.y };
      setTarget(null);
      clearTimeout(offlineTipTimer.current);
      setOfflineTip({ ...pos, text: t("notOnline") });
      offlineTipTimer.current = setTimeout(() => setOfflineTip(null), 3000);
      return;
    }
    if (result?.sent) {
      setCooldownSecs(Math.ceil(result.cooldownMs / 1000));
    } else if (result?.remainingMs) {
      setCooldownSecs(Math.ceil(result.remainingMs / 1000));
    }
  };

  const handleFollow = () => {
    if (window.__onFollowToggle) window.__onFollowToggle(target.id);
  };

  // Position near click point
  const style = {};
  if (target.x != null) {
    style.left = target.x;
    style.top = target.y;
    style.transform = "translate(-50%, -100%)";
  }

  return (
    <article className={styles.card} ref={cardRef} style={style}>
      <div className={styles.inner}>
        {!isSelf && (
          <button className={styles.star} onClick={handleFollow} aria-label={player._followed ? "Unfollow" : "Follow"}>
            {player._followed ? "★" : "☆"}
          </button>
        )}
        <header className={styles.header}>
          <canvas ref={avatarRef} className={styles.avatar} width={48} height={48} />
          <div className={styles.headerText}>
            <div className={styles.nameRow}>
              <strong className={`${styles.name} ${isSelf ? styles.nameSelf : player._followed ? styles.nameFollowed : ""}`}>{player.name}</strong>
              <span className={styles.profPill} style={{ color: PROFESSION_COLORS[player.profession] || PROFESSION_COLORS.mystery, background: (PROFESSION_COLORS[player.profession] || PROFESSION_COLORS.mystery) + "20" }}>
                {t("prof" + ((player.profession || "mystery").charAt(0).toUpperCase() + (player.profession || "mystery").slice(1)))}
              </span>
            </div>
            {player.timezoneHour != null && (() => {
              const tk = debugTimeIdx >= 0 ? TIME_KEYS[debugTimeIdx] : getTimePeriodKey(player.timezoneHour);
              return (
                <div className={styles.timezone} onClick={() => setDebugTimeIdx((i) => (i + 1) % TIME_KEYS.length)} style={{ cursor: "pointer" }}>
                  <span style={{ color: TIME_DOT_COLORS[tk] || "#888", display: "inline-flex", alignItems: "center" }}><PixelIcon name="circle" className={styles.tzDot} /></span>
                  {t(tk)}
                </div>
              );
            })()}
          </div>
        </header>

        <hr className={styles.divider} />

        {player.tagline && <p className={styles.tagline}>{player.tagline}</p>}

        {player.languages?.length > 0 && (
          <ul className={styles.languages}>
            {player.languages.map((l) => (
              <li key={l} className={styles.langPill}>{langLabel(l)}</li>
            ))}
          </ul>
        )}

        {!isSelf && (
          <>
            <hr className={styles.divider} />
            <div className={styles.reactions} role="group" aria-label="Reactions">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className={`${styles.emojiBtn} ${cooldownSecs > 0 ? styles.emojiBtnCooldown : ""}`}
                  onClick={() => handleReaction(emoji)}
                  disabled={cooldownSecs > 0}
                  aria-label={`Send ${emoji}`}
                >
                  {cooldownSecs > 0 ? cooldownSecs : emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
