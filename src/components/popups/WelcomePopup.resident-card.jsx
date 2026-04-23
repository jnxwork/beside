/**
 * WelcomePopup — Passport 方案（预览用，不影响现有代码）
 *
 * 两步流程：
 * Step 1 — 编辑页：填写信息 + 定制形象 → 点击「生成护照」
 * Step 2 — 证件页：只读展示 + BESIDE 盖章动画 → 「返回修改」或「进入」
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { PixelButton, PixelInput, PixelCheckbox, PixelFadeIn, PixelSelect } from "@pxlkit/ui-kit";
import PixelIcon from "../shared/PixelIcon.jsx";
import useUiStore from "../../stores/uiStore.js";
import useAuthStore from "../../stores/authStore.js";
import { useT, useLang } from "../../i18n/index.js";
import styles from "./WelcomePopup.resident-card.module.css";
import { PROFESSION_COLORS, PROFESSION_KEYS, TIME_DOT_COLORS } from "../../constants.js";

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const MONTH_KEYS = [
  "monthJan", "monthFeb", "monthMar", "monthApr",
  "monthMay", "monthJun", "monthJul", "monthAug",
  "monthSep", "monthOct", "monthNov", "monthDec",
];

/* ── Step 1: Edit page ── */

function EditPage({ name, setName, tagline, setTagline, langs, toggleLang,
  birthMonth, setBirthMonth, profession, setProfession,
  nameLen, setNameLen, taglineLen, setTaglineLen, composingRef,
  previewRef, timeSlotKey, t, onGenerate, setAuthOpen }) {

  const [nameError, setNameError] = useState(false);
  const fp = { tone: "gold", size: "sm" }; // shared field props

  const handleNext = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    onGenerate();
  };

  return (
    <div className={styles.inner}>
      <div className={styles.body}>
        {/* Left: character customizer */}
        <div className={styles.left}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("rcSectionAppearance")}</h2>
          </div>
          <div className={styles.previewArea}>
            <button id="welcome-dice" className={styles.dice} aria-label="Randomize">🎲</button>
            <canvas id="welcome-preview-canvas" ref={previewRef} className={styles.previewCanvas} />
          </div>
          <div className={styles.modeTabs}>
            <button id="welcome-mode-preset" className={`${styles.modeTab} active`}>
              {t("presetTab")}
            </button>
            <button id="welcome-mode-custom" className={styles.modeTab}>
              {t("customTab")}
            </button>
          </div>
          <div className={styles.customizer}>
            <div className={styles.presetsGrid} id="welcome-presets" />
            <div className={styles.custTabs} id="welcome-tabs">
              {["body", "eyes", "outfit", "hair", "acc"].map((tab) => (
                <button key={tab} className={`${styles.ctab} ctab`} data-tab={tab}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className={styles.custOptions} id="welcome-options" />
            <div className={styles.custVariants} id="welcome-variants" />
          </div>
        </div>

        {/* Right: profile fields */}
        <div className={styles.right}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("rcSectionInfo")}</h2>
            <span className={styles.tipToggle} data-tip={t("welcomeControls").replace(/\n/g, " ")} tabIndex={0} role="button">?</span>
          </div>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("displayedNameLabel")}</label>
              <div className={styles.inputWrap}>
                <PixelInput
                  {...fp}
                  value={name}
                  onChange={(e) => { const v = composingRef.current ? e.target.value : e.target.value.replace(/\s/g, ""); setName(v); if (!composingRef.current) setNameLen(v.length); if (nameError) setNameError(false); }}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={(e) => { composingRef.current = false; const v = e.target.value.replace(/\s/g, ""); setName(v); setNameLen(v.length); if (nameError) setNameError(false); }}
                  placeholder={t("namePlaceholder")}
                  maxLength={20}
                  className={`${styles.inputWithCounter} ${nameError ? styles.inputError : ""}`}
                />
                <span className={styles.counter}>{nameLen}/20</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                {t("birthMonthLabel")}
                <span className={styles.tipToggle} data-tip={t("birthMonthTip")} tabIndex={0} role="button">?</span>
              </label>
              <div className={styles.birthMonthWrap}>
                <PixelSelect
                  {...fp}
                  value={birthMonth != null ? String(birthMonth) : ""}
                  onChange={(v) => setBirthMonth(v ? Number(v) : null)}
                  options={[
                    { value: "", label: t("birthMonthNone") },
                    ...MONTH_KEYS.map((key, i) => ({ value: String(i + 1), label: t(key) })),
                  ]}
                  placeholder={t("birthMonthNone")}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("taglineLabel")}</label>
              <div className={styles.inputWrap}>
                <PixelInput
                  {...fp}
                  value={tagline}
                  onChange={(e) => { setTagline(e.target.value); if (!composingRef.current) setTaglineLen(e.target.value.length); }}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={(e) => { composingRef.current = false; setTagline(e.target.value); setTaglineLen(e.target.value.length); }}
                  placeholder={t("taglinePlaceholder")}
                  maxLength={100}
                  className={styles.inputWithCounter}
                />
                <span className={styles.counter}>{taglineLen}/100</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("professionLabel")}</label>
              <PixelSelect
                {...fp}
                value={profession}
                onChange={setProfession}
                options={PROFESSION_KEYS.map((k) => ({
                  value: k,
                  label: t("prof" + k.charAt(0).toUpperCase() + k.slice(1)),
                  icon: <span style={{ display: "block", width: 12, height: 12, borderRadius: 4, flexShrink: 0, background: PROFESSION_COLORS[k] }} />,
                }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("iSpeakLabel")}</label>
              <div className={styles.langTags}>
                {LANG_OPTIONS.map((l) => (
                  <PixelCheckbox
                    key={l.code}
                    label={l.label}
                    checked={langs.includes(l.code)}
                    onChange={() => toggleLang(l.code)}
                    tone={fp.tone}
                  />
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("localTimeLabel")}</label>
              <div className={styles.tzDisplay}>
                <span style={{ color: TIME_DOT_COLORS[timeSlotKey] || "#888", display: "inline-flex", alignItems: "center" }}><PixelIcon name="circle" className={styles.tzDot} /></span>
                {t(timeSlotKey)}
              </div>
            </div>
          </div>
          <div className={styles.rightBottom}>
            <PixelButton tone="gold" size="md" className={styles.enterBtn} onClick={handleNext}>
              {t("rcGenerate")}
            </PixelButton>
            {/* Hidden until registration feature */}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Generate MRZ-style string: B<BESIDE<BESIDER<<NAME<<<<<<<<<<<<< */
function buildMrz(name, isLoggedIn) {
  const type = isLoggedIn ? "BESIDER" : "WANDERER";
  const initial = type.charAt(0);
  const clean = (name || "ANONYMOUS").toUpperCase().replace(/[\s\p{P}\p{S}]/gu, "<");
  const prefix = isLoggedIn ? "BSDP" : "BSDT";
  const line = `${initial}<BESIDE<${type}<<${clean}<<${prefix}000001`;
  return line.padEnd(200, "<");
}

/* ── Step 2: Card page ── */
function CardPage({ name, tagline, langs, birthMonth, profession, issueDate,
  t, stamped, onBack, onEnter, cardCanvasRef, isLoggedIn }) {
  const displayName = name || "Anonymous";
  const mrz = buildMrz(name, isLoggedIn);

  const validUntil = isLoggedIn
    ? t("rcPermanent")
    : t("rcUntilCacheClear");

  return (
    <article className={styles.card}>
      {/* Watermark pattern */}
      <div className={styles.watermark} aria-hidden="true">
        {"⌂ ".repeat(80)}
      </div>

      {/* Card header + action buttons */}
      <header className={styles.cardHeader}>
        <span className={styles.headerIcon} aria-hidden="true">⌂</span>
        <h2 className={styles.headerTitle}>BESIDE — PASSPORT</h2>
        <div className={styles.headerActions}>
          <PixelButton variant="ghost" size="sm" onClick={onBack}>
            {t("rcBackEdit")}
          </PixelButton>
          <PixelButton tone="gold" size="sm" onClick={onEnter}>
            {t("welcomeEnter")}
          </PixelButton>
        </div>
      </header>

      {/* Card body */}
      <div className={styles.cardBody}>
        {/* Photo */}
        <div className={styles.photoFrame}>
          <canvas ref={cardCanvasRef} className={styles.cardCanvas} />
        </div>

        <div className={styles.cardRight}>
          {/* Info — vertical stack */}
          <dl className={styles.cardInfo}>
            <div className={styles.cardField}>
              <dt className={styles.cardFieldLabel}>{t("displayedNameLabel")}</dt>
              <dd className={styles.cardFieldValue}>{displayName}</dd>
            </div>
            <div className={styles.cardField}>
              <dt className={styles.cardFieldLabel}>{t("professionLabel")}</dt>
              <dd className={styles.cardFieldValue} style={{ color: PROFESSION_COLORS[profession] || PROFESSION_COLORS.mystery }}>
                {t("prof" + (profession || "mystery").charAt(0).toUpperCase() + (profession || "mystery").slice(1))}
              </dd>
            </div>
            {birthMonth && (
              <div className={styles.cardField}>
                <dt className={styles.cardFieldLabel}>{t("birthMonthLabelShort")}</dt>
                <dd className={styles.cardFieldValue}>{t(MONTH_KEYS[birthMonth - 1])}</dd>
              </div>
            )}
            {/* Hidden until registration feature */}
            <div className={styles.cardField}>
              <dt className={styles.cardFieldLabel}>{t("iSpeakLabel")}</dt>
              <dd className={styles.cardLangs}>
                {langs.map((code) => {
                  const opt = LANG_OPTIONS.find((l) => l.code === code);
                  return <span key={code} className={styles.langBadge}>{opt?.label || code}</span>;
                })}
              </dd>
            </div>
            <div className={styles.cardField}>
              <dt className={styles.cardFieldLabel}>{t("rcIssued")}</dt>
              <dd className={styles.cardFieldValue}><time>{issueDate}</time></dd>
            </div>
            {/* Valid-until field hidden for now — revisit if users ask */}
          </dl>

          {/* Bio — right side, only if exists */}
          {tagline && (
            <div className={styles.cardBioArea}>
              <div className={styles.cardFieldLabel}>{t("taglineLabelShort")}</div>
              <div className={styles.cardBioText}>{tagline}</div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden until registration feature */}
    </article>
  );
}

/* ── Main ── */
export default function WelcomePopup() {
  const t = useT();
  const setWelcomeOpen = useUiStore((s) => s.setWelcomeOpen);
  const welcomeInitialStep = useUiStore((s) => s.welcomeInitialStep);
  const setAuthOpen = useUiStore((s) => s.setAuthOpen);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRegistered = useAuthStore((s) => s.isRegistered);

  const [step, setStep] = useState(welcomeInitialStep); // 1 = edit, 2 = card
  const [stamped, setStamped] = useState(false);

  const [name, setName] = useState(localStorage.getItem("playerName") || "");
  const [tagline, setTagline] = useState(localStorage.getItem("playerTagline") || "");
  const [profession, setProfession] = useState(localStorage.getItem("playerProfession") || "mystery");
  const [langs, setLangs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("playerLanguages") || '["en"]');
    } catch { return ["en"]; }
  });
  const [birthMonth, setBirthMonth] = useState(() => {
    const saved = localStorage.getItem("playerBirthMonth");
    if (saved) { const n = parseInt(saved, 10); if (n >= 1 && n <= 12) return n; }
    return null;
  });

  const previewRef = useRef(null);
  const cardCanvasRef = useRef(null);
  const composingRef = useRef(false);
  const [nameLen, setNameLen] = useState(name.length);
  const [taglineLen, setTaglineLen] = useState(tagline.length);

  const getTimeSlotKey = () => {
    const h = new Date().getHours();
    if (h < 5) return "timeLateNight";
    if (h < 8) return "timeMorning";
    if (h < 11) return "timeForenoon";
    if (h < 13) return "timeNoon";
    if (h < 17) return "timeAfternoon";
    if (h < 19) return "timeDusk";
    return "timeNight";
  };
  const [timeSlotKey, setTimeSlotKey] = useState(getTimeSlotKey);
  useEffect(() => {
    const id = setInterval(() => setTimeSlotKey(getTimeSlotKey()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      window.__initWelcomeCustomizer?.();
    });
  }, []);

  const lang = useLang();
  const dateLocale = lang === "zh" ? "zh-CN" : "en-GB";

  // For logged-in users, use account creation date; for wanderers, use first visit
  const issueDate = (() => {
    if (isRegistered) {
      const createdAt = localStorage.getItem("accountCreatedAt");
      if (createdAt) {
        const timestamp = parseInt(createdAt, 10);
        if (!isNaN(timestamp)) {
          const date = new Date(timestamp * 1000); // Unix timestamp in seconds
          return date.toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
        }
      }
    }
    // Fallback: use first visit date for wanderers (or current date if first time)
    let firstVisit = localStorage.getItem("firstVisit");
    if (!firstVisit) {
      firstVisit = String(Math.floor(Date.now() / 1000));
      localStorage.setItem("firstVisit", firstVisit);
    }
    const timestamp = parseInt(firstVisit, 10);
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  })();

  const toggleLang = useCallback((code) => {
    setLangs((prev) => {
      if (prev.includes(code)) {
        return prev.length > 1 ? prev.filter((l) => l !== code) : prev;
      }
      return [...prev, code];
    });
  }, []);

  const savedAvatarRef = useRef(null);

  const handleGenerate = () => {
    // Save avatar BEFORE unmounting step 1
    const src = document.getElementById("welcome-preview-canvas");
    if (src) {
      const tmp = document.createElement("canvas");
      tmp.width = src.width;
      tmp.height = src.height;
      tmp.getContext("2d").drawImage(src, 0, 0);
      savedAvatarRef.current = tmp;
    }
    setStamped(false);
    setStep(2);
    // Draw headshot to card canvas (3:4 passport crop from 32×64 sprite)
    setTimeout(() => {
      const dst = cardCanvasRef.current;
      const saved = savedAvatarRef.current;
      if (dst && saved) {
        // Crop 28×34 — passport photo, head + shoulders
        dst.width = 28;
        dst.height = 34;
        const ctx = dst.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(saved, 2, 18, 28, 34, 0, 0, 28, 34);
      }
      setTimeout(() => setStamped(true), 400);
    }, 50);
  };

  const handleBack = () => {
    setStep(1);
    // Re-init customizer after switching back
    requestAnimationFrame(() => {
      window.__initWelcomeCustomizer?.();
    });
  };

  const handleEnter = () => {
    const finalName = name.trim() || "Anonymous";
    localStorage.setItem("playerName", finalName);
    localStorage.setItem("playerTagline", tagline);
    localStorage.setItem("playerProfession", profession);
    localStorage.setItem("playerLanguages", JSON.stringify(langs));
    localStorage.setItem("playerBirthMonth", birthMonth != null ? String(birthMonth) : "");
    if (window.__onWelcomeEnter) {
      window.__onWelcomeEnter({ name: finalName, tagline, profession, languages: langs, birthMonth });
    }
    setWelcomeOpen(false);
  };

  // When opening directly to step 2, load the avatar from game.js
  useEffect(() => {
    if (step === 2 && !savedAvatarRef.current) {
      const avatarCanvas = window.__getCurrentAvatarCanvas?.();
      if (avatarCanvas) {
        savedAvatarRef.current = avatarCanvas;
        // Draw passport photo crop to card canvas
        setTimeout(() => {
          const dst = cardCanvasRef.current;
          if (dst && avatarCanvas) {
            dst.width = 28;
            dst.height = 34;
            const ctx = dst.getContext("2d");
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(avatarCanvas, 2, 18, 28, 34, 0, 0, 28, 34);
          }
          setTimeout(() => setStamped(true), 400);
        }, 50);
      }
    }
  }, [step]);

  return (
    <div className={styles.overlay}>
      <PixelFadeIn duration={300}>
        {step === 1 ? (
          <EditPage
            name={name} setName={setName}
            tagline={tagline} setTagline={setTagline}
            langs={langs} toggleLang={toggleLang}
            birthMonth={birthMonth} setBirthMonth={setBirthMonth}
            profession={profession} setProfession={setProfession}
            nameLen={nameLen} setNameLen={setNameLen}
            taglineLen={taglineLen} setTaglineLen={setTaglineLen}
            composingRef={composingRef}
            previewRef={previewRef}
            timeSlotKey={timeSlotKey}
            t={t}
            onGenerate={handleGenerate}
            setAuthOpen={setAuthOpen}
          />
        ) : (
          <CardPage
            name={name} tagline={tagline} langs={langs}
            birthMonth={birthMonth} profession={profession} issueDate={issueDate}
            t={t} stamped={stamped}
            onBack={handleBack} onEnter={handleEnter}
            cardCanvasRef={cardCanvasRef}
            isLoggedIn={isRegistered}
          />
        )}
      </PixelFadeIn>
    </div>
  );
}
