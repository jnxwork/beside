import { useState, useEffect, useRef, useCallback } from "react";
import { PixelModal, PixelButton, PixelTextarea } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import useBulletinStore from "../../stores/bulletinStore.js";
import { useT } from "../../i18n/index.js";
import PixelIcon from "../shared/PixelIcon.jsx";
import styles from "./BulletinPopup.module.css";

const NOTE_COLORS = ["yellow", "pink", "blue", "green", "purple"];

function relativeTime(ts, t) {
  const diff = Date.now() - ts;
  if (diff < 60000) return t("timeJustNow");
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t("timeMinAgo").replace("{0}", mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("timeHourAgo").replace("{0}", hrs);
  const days = Math.floor(hrs / 24);
  if (days < 7) return t("timeDayAgo").replace("{0}", days);
  const weeks = Math.floor(days / 7);
  return t("timeWeekAgo").replace("{0}", weeks);
}

export default function BulletinPopup() {
  const t = useT();
  const setBulletinOpen = useUiStore((s) => s.setBulletinOpen);
  const announcements = useBulletinStore((s) => s.announcements);
  const notes = useBulletinStore((s) => s.notes);
  const myLikes = useBulletinStore((s) => s.myLikes);
  const toggleMyLike = useBulletinStore((s) => s.toggleMyLike);

  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [cooldown, setCooldown] = useState(0); // seconds remaining
  const timerRef = useRef(null);

  // Trigger data fetch on mount
  useEffect(() => {
    window.__onBulletinOpen?.();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); timerRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handlePost = () => {
    if (!text.trim() || cooldown > 0) return;
    if (window.__onBulletinPost) {
      window.__onBulletinPost(text.trim(), selectedColor);
    }
    setText("");
    startCooldown();
  };

  const handleLike = (noteId) => {
    toggleMyLike(noteId);
    if (window.__onBulletinLike) window.__onBulletinLike(noteId);
  };

  const handleDelete = (noteId) => {
    if (window.__onBulletinDelete) window.__onBulletinDelete(noteId);
  };

  return (
    <PixelModal
      open={true}
      title={t("bulletinTitle")}
      onClose={() => setBulletinOpen(false)}
      size="lg"
    >
      <div className={styles.scroll}>
        {/* Announcements — hidden when empty */}
        {announcements.length > 0 && (
          <>
            <h3 className={styles.sectionLabel}>{t("bulletinAnnouncements")}</h3>
            {announcements.map((ann) => (
              <article key={ann.id} className={styles.annItem}>
                <p className={styles.annText}>{ann.text}</p>
                <footer className={styles.annMeta}>{ann.author_name}</footer>
              </article>
            ))}
            <div className={styles.divider} />
          </>
        )}

        {/* Notes */}
        <h3 className={styles.sectionLabel}>{t("bulletinNotes")}</h3>
        {notes.length === 0 && (
          <div className={styles.empty}>{t("bulletinEmpty")}</div>
        )}
        <div className={styles.notesGrid}>
          {notes.map((note) => {
            const liked = myLikes.has(note.id);
            return (
              <article key={note.id} className={`${styles.noteCard} ${note._isMine ? styles.noteOwn : ""} ${styles[`color${note.color?.charAt(0).toUpperCase()}${note.color?.slice(1)}`] || ""}`}>
                <header className={styles.noteHeader}>
                  <span className={styles.noteAuthor}>
                    {note.author_name}
                    {note.author_profession && note.author_profession !== "mystery" && (
                      <span className={styles.noteProfession}>{t(`prof${note.author_profession.charAt(0).toUpperCase()}${note.author_profession.slice(1)}`)}</span>
                    )}
                  </span>
                  {note._isMine && (
                    <button className={styles.noteDelete} onClick={() => handleDelete(note.id)} aria-label={t("bulletinDelete") || "Delete"}><PixelIcon name="trash" size="sm" /></button>
                  )}
                </header>
                <p className={styles.noteText}>{note.text}</p>
                <footer className={styles.noteMeta}>
                  {note.created_at && <span className={styles.noteTime}>{relativeTime(note.created_at, t)}</span>}
                  <button
                    className={`${styles.noteLike} ${liked ? styles.noteLiked : ""}`}
                    onClick={() => handleLike(note.id)}
                  >
                    <img
                      src={liked ? "/icons/heart_filled.svg" : "/icons/heart_outline.svg"}
                      alt={liked ? "Unlike" : "Like"}
                      className={styles.heartIcon}
                    />
                    {note.like_count > 0 && note.like_count}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <PixelTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("bulletinPlaceholder")}
          maxLength={100}
          rows={2}
          tone="gold"
        />
        <div className={styles.inputMeta}>
          <div className={styles.colorPicker}>
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                className={`${styles.colorDot} ${styles[`dot${c.charAt(0).toUpperCase()}${c.slice(1)}`]} ${selectedColor === c ? styles.colorDotActive : ""}`}
                onClick={() => setSelectedColor(c)}
                aria-label={c}
              />
            ))}
          </div>
          <div className={styles.charCount}>{text.length}/100</div>
        </div>
      </div>

      <div className={styles.bottomActions}>
        <PixelButton variant="ghost" onClick={() => setBulletinOpen(false)}>
          {t("bulletinClose")}
        </PixelButton>
        <PixelButton
          tone="gold"
          onClick={handlePost}
          disabled={!text.trim() || cooldown > 0}
        >
          {cooldown > 0 ? `${cooldown}s` : t("bulletinPost")}
        </PixelButton>
      </div>
    </PixelModal>
  );
}
