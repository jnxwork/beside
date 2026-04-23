import { useMemo, useState } from "react";
import { PixelModal, PixelButton } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import useFocusStore from "../../stores/focusStore.js";
import { useT, getLang } from "../../i18n/index.js";
import PixelIcon from "../shared/PixelIcon.jsx";
// import PreviewCardPopup from "./PreviewCardPopup.jsx"; // hidden for now
import styles from "./HistoryPopup.module.css";

const CAT_ICONS = {
  working: "\u{1F4BC}", studying: "\u{1F4D6}", reading: "\u{1F4DA}",
  writing: "\u270F\uFE0F", creating: "\u{1F3A8}", exercising: "\u{1F3CB}\uFE0F",
};

function formatDuration(ms, t) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} ${t("historyMin")}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}${t("historyH")} ${m}${t("historyMin")}` : `${h}${t("historyH")}`;
}

export default function HistoryPopup() {
  const t = useT();
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const history = useFocusStore((s) => s.history);
  const deleteRecord = useFocusStore((s) => s.deleteRecord);

  const todayStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayRecords = history.filter((r) => r.startTime >= todayStart);
    const totalMs = todayRecords.reduce((s, r) => s + r.duration, 0);
    return { count: todayRecords.length, totalMs };
  }, [history]);

  const catStats = useMemo(() => {
    const cats = {};
    history.forEach((r) => {
      cats[r.category] = (cats[r.category] || 0) + r.duration;
    });
    const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, ms]) => ({ cat, ms, pct: Math.round((ms / total) * 100) }));
  }, [history]);

  const lang = getLang();

  const weekStats = useMemo(() => {
    const now = new Date();
    // Monday of current week
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday=0
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    const mondayMs = monday.getTime();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const locale = lang === "zh" ? "zh-CN" : "en-US";
    const opts = { month: "short", day: "numeric" };
    const dateRange = `${monday.toLocaleDateString(locale, opts)} – ${sunday.toLocaleDateString(locale, opts)}, ${now.getFullYear()}`;

    const weekRecords = history.filter((r) => r.startTime >= mondayMs);
    const totalMs = weekRecords.reduce((s, r) => s + r.duration, 0);
    const sessions = weekRecords.length;

    const cats = {};
    weekRecords.forEach((r) => {
      cats[r.category] = (cats[r.category] || 0) + r.duration;
    });
    const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    const categories = Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, ms]) => ({ cat, ms, pct: Math.round((ms / total) * 100) }));

    return { dateRange, totalMs, sessions, categories };
  }, [history, lang]);

  const months = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    // Determine start month from earliest record, or current month
    let startYear = curYear, startMonth = curMonth;
    if (history.length > 0) {
      const earliest = Math.min(...history.map((r) => r.startTime));
      const d = new Date(earliest);
      startYear = d.getFullYear();
      startMonth = d.getMonth();
    }

    const result = [];
    let y = curYear, m = curMonth;
    // Build newest-first
    while (y > startYear || (y === startYear && m >= startMonth)) {
      const firstDay = new Date(y, m, 1);
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      // Mon=0 ... Sun=6
      const firstDow = (firstDay.getDay() + 6) % 7;

      const days = [];
      for (let i = 0; i < firstDow; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStart = new Date(y, m, d).getTime();
        const dayEnd = dayStart + 86400000;
        const isFuture = dayStart > now.getTime();
        const dayMs = isFuture ? 0 : history
          .filter((r) => r.startTime >= dayStart && r.startTime < dayEnd)
          .reduce((s, r) => s + r.duration, 0);
        days.push({
          day: d,
          ms: dayMs,
          isToday: y === curYear && m === curMonth && d === now.getDate(),
          isFuture,
        });
      }

      result.push({
        label: firstDay.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long" }),
        days,
      });

      // Move to previous month
      m--;
      if (m < 0) { m = 11; y--; }
    }
    return result;
  }, [history, lang]);

  const [monthIdx, setMonthIdx] = useState(0);
  // const [showPreview, setShowPreview] = useState(false); // hidden for now
  const weekdays = t("historyWeekdays").split("|");
  const currentMonth = months[monthIdx];

  return (
    <>
      <PixelModal
        open={true}
        title={t("historyTitle")}
        onClose={() => setHistoryOpen(false)}
        size="md"
      >
        <div className={styles.scroll}>
        {/* Today summary */}
        <div className={styles.todaySummary}>
          <span className={styles.todayLabel}>{t("historyToday")}</span>
          <span className={styles.todayTime}>{formatDuration(todayStats.totalMs, t)}</span>
          <span className={styles.todaySessions}>
            {todayStats.count} {t("historySessions")}
          </span>
        </div>

        {/* Month calendar with nav */}
        {currentMonth && (
          <div className={styles.monthBlock}>
            <div className={styles.monthNav}>
              <button
                className={styles.monthArrow}
                disabled={monthIdx >= months.length - 1}
                onClick={() => setMonthIdx((i) => i + 1)}
              >{"‹"}</button>
              <span className={styles.monthLabel}>{currentMonth.label}</span>
              <button
                className={styles.monthArrow}
                disabled={monthIdx <= 0}
                onClick={() => setMonthIdx((i) => i - 1)}
              >{"›"}</button>
            </div>
            <div className={styles.heatmap}>
              {weekdays.map((d, i) => (
                <div key={i} className={styles.heatmapHeader}>{d}</div>
              ))}
              {currentMonth.days.map((d, i) => {
                if (!d) return <div key={i} className={styles.heatmapEmpty} />;
                const mins = Math.floor(d.ms / 60000);
                const alpha = Math.min(mins / 120, 1);
                const bg = d.isFuture
                  ? "rgba(74,90,110,0.12)"
                  : d.ms > 0
                    ? `rgba(136,192,214,${0.15 + alpha * 0.7})`
                    : "rgba(74,90,110,0.3)";
                return (
                  <div
                    key={i}
                    className={`${styles.heatmapCell} ${d.isToday ? styles.heatmapToday : ""} ${d.isFuture ? styles.heatmapFuture : ""}`}
                    style={{ background: bg }}
                    title={d.isFuture ? "" : `${d.day}: ${formatDuration(d.ms, t)}`}
                  >
                    {d.day}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.sectionDivider} />

        {/* Categories */}
        <h3 className={styles.sectionLabel}>{t("historyCategories")}</h3>
        <div className={styles.categories}>
          {catStats.length === 0 && (
            <div className={styles.noData}>{t("historyNoData")}</div>
          )}
          {catStats.map(({ cat, ms, pct }) => (
            <div key={cat} className={styles.catRow}>
              <span className={styles.catIcon}>{CAT_ICONS[cat] || "\u{1F4CB}"}</span>
              <span className={styles.catName}>{t(cat) || cat}</span>
              <span className={styles.catTime}>{formatDuration(ms, t)}</span>
              <div className={styles.catBarWrap}>
                <div className={styles.catBar} style={{ width: `${pct}%` }} />
              </div>
              <span className={styles.catPct}>{pct}%</span>
            </div>
          ))}
        </div>

        <div className={styles.sectionDivider} />

        {/* Recent sessions */}
        <h3 className={styles.sectionLabel}>{t("historyRecentSessions")}</h3>
        <ul className={styles.list}>
          {history.length === 0 && (
            <div className={styles.noData}>{t("historyNoData")}</div>
          )}
          {history.slice(0, 50).map((r, i) => (
            <li key={i} className={styles.row}>
              <span className={styles.rowIcon}>{CAT_ICONS[r.category] || "\u{1F4CB}"}</span>
              <div className={styles.rowInfo}>
                <div className={styles.rowTask}>{r.taskName || t(r.category) || r.category}</div>
                <div className={styles.rowDate}>
                  {new Date(r.startTime).toLocaleDateString()}
                </div>
              </div>
              <span className={styles.rowDuration}>{formatDuration(r.duration, t)}</span>
              <button className={styles.rowDelete} onClick={() => deleteRecord(i)} aria-label={t("historyDelete") || "Delete"}><PixelIcon name="cancel" /></button>
            </li>
          ))}
        </ul>
        </div>
        <div className={styles.actions}>
          <PixelButton variant="ghost" onClick={() => setHistoryOpen(false)}>
            {t("historyClose")}
          </PixelButton>
        </div>
      </PixelModal>

      {/* Preview card hidden for now
      {showPreview && (
        <PreviewCardPopup
          data={{
            dateRange: weekStats.dateRange,
            totalMs: weekStats.totalMs,
            sessions: weekStats.sessions,
            categories: weekStats.categories,
            lang,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
      */}
    </>
  );
}
