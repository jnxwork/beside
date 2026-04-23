import { useState, useRef, useEffect } from "react";
import { PixelButton, PixelInput, PixelCheckbox, PixelFadeIn, PixelSelect } from "@pxlkit/ui-kit";
import PixelIcon from "../shared/PixelIcon.jsx";
import useUiStore from "../../stores/uiStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./WelcomePopup.module.css";
import { PROFESSION_COLORS, PROFESSION_KEYS, TIME_DOT_COLORS } from "../../constants.js";

const LANG_OPTIONS = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

export default function WelcomePopup() {
  const t = useT();
  const setWelcomeOpen = useUiStore((s) => s.setWelcomeOpen);
  const setAuthOpen = useUiStore((s) => s.setAuthOpen);

  const [name, setName] = useState(localStorage.getItem("playerName") || "");
  const [tagline, setTagline] = useState(localStorage.getItem("playerTagline") || "");
  const [profession, setProfession] = useState(localStorage.getItem("playerProfession") || "mystery");
  const [langs, setLangs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("playerLanguages") || '["en"]');
    } catch { return ["en"]; }
  });

  const previewRef = useRef(null);
  const composingRef = useRef(false);
  const [nameLen, setNameLen] = useState(name.length);
  const [taglineLen, setTaglineLen] = useState(tagline.length);

  // Local time slot display
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

  // Tell game.js to reinitialize customizer when this component mounts
  useEffect(() => {
    // Give DOM a frame to settle, then ask game.js to re-init
    requestAnimationFrame(() => {
      window.__initWelcomeCustomizer?.();
    });
  }, []);

  const toggleLang = (code) => {
    setLangs((prev) => {
      if (prev.includes(code)) {
        return prev.length > 1 ? prev.filter((l) => l !== code) : prev;
      }
      return [...prev, code];
    });
  };

  const handleEnter = () => {
    const finalName = name.trim() || "Anonymous";
    localStorage.setItem("playerName", finalName);
    localStorage.setItem("playerTagline", tagline);
    localStorage.setItem("playerProfession", profession);
    localStorage.setItem("playerLanguages", JSON.stringify(langs));

    if (window.__onWelcomeEnter) {
      window.__onWelcomeEnter({ name: finalName, tagline, profession, languages: langs });
    }

    setWelcomeOpen(false);
  };

  const isMobile = "ontouchstart" in window;

  return (
    <div className={styles.overlay}>
      <PixelFadeIn duration={300}>
        <div className={styles.inner}>
          <div className={styles.body}>
            {/* Left: character customizer — game.js populates these containers */}
            <div className={styles.left}>
              <div className={styles.previewArea}>
                <button
                  id="welcome-dice"
                  className={styles.dice}
                >
                  🎲
                </button>
                <div>
                  <canvas id="welcome-preview-canvas" ref={previewRef} className={styles.previewCanvas} />
                </div>
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
                {/* Presets grid — game.js fills this */}
                <div className={styles.presetsGrid} id="welcome-presets" />
                {/* Custom tabs — game.js binds click events */}
                <div className={styles.custTabs} id="welcome-tabs">
                  {["body", "eyes", "outfit", "hair", "acc"].map((tab) => (
                    <button key={tab} className={`${styles.ctab} ctab`} data-tab={tab}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Options + variants — game.js fills these */}
                <div className={styles.custOptions} id="welcome-options" />
                <div className={styles.custVariants} id="welcome-variants" />
              </div>
            </div>

            <div className={styles.divider} />

            {/* Right: profile fields */}
            <div className={styles.right}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>{t("displayedNameLabel")}</div>
                  <div className={styles.inputWrap}>
                    <PixelInput
                      value={name}
                      onChange={(e) => { const v = composingRef.current ? e.target.value : e.target.value.replace(/\s/g, ""); setName(v); if (!composingRef.current) setNameLen(v.length); }}
                      onCompositionStart={() => { composingRef.current = true; }}
                      onCompositionEnd={(e) => { composingRef.current = false; const v = e.target.value.replace(/\s/g, ""); setName(v); setNameLen(v.length); }}
                      placeholder={t("namePlaceholder")}
                      maxLength={20}
                      tone="gold"
                      size="sm"
                      className={styles.inputWithCounter}
                    />
                    <span className={styles.counter}>{nameLen}/20</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>{t("taglineLabel")}</div>
                  <div className={styles.inputWrap}>
                    <PixelInput
                      value={tagline}
                      onChange={(e) => { setTagline(e.target.value); if (!composingRef.current) setTaglineLen(e.target.value.length); }}
                      onCompositionStart={() => { composingRef.current = true; }}
                      onCompositionEnd={(e) => { composingRef.current = false; setTagline(e.target.value); setTaglineLen(e.target.value.length); }}
                      placeholder={t("taglinePlaceholder")}
                      maxLength={100}
                      tone="gold"
                      size="sm"
                      className={styles.inputWithCounter}
                    />
                    <span className={styles.counter}>{taglineLen}/100</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>{t("professionLabel")}</div>
                  <PixelSelect
                    value={profession}
                    onChange={setProfession}
                    options={PROFESSION_KEYS.map((k) => ({
                      value: k,
                      label: t("prof" + k.charAt(0).toUpperCase() + k.slice(1)),
                      icon: <span style={{ display: "block", width: 12, height: 12, borderRadius: 4, flexShrink: 0, background: PROFESSION_COLORS[k] }} />,
                    }))}
                    tone="gold"
                    size="sm"
                  />
                </div>
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>{t("iSpeakLabel")}</div>
                  <div className={styles.langTags}>
                    {LANG_OPTIONS.map((l) => (
                      <PixelCheckbox
                        key={l.code}
                        label={l.label}
                        checked={langs.includes(l.code)}
                        onChange={() => toggleLang(l.code)}
                        tone="gold"
                      />
                    ))}
                  </div>
                  <div className={styles.fieldHint}>{t("iSpeakHint")}</div>
                </div>
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>{t("localTimeLabel")}</div>
                  <div className={styles.tzDisplay}>
                    <span style={{ color: TIME_DOT_COLORS[timeSlotKey] || "#888", display: "inline-flex", alignItems: "center" }}><PixelIcon name="circle" className={styles.tzDot} /></span>
                    {t(timeSlotKey)}
                  </div>
                </div>
              </div>
              <div className={styles.rightBottom}>
                <PixelButton tone="gold" size="md" className={styles.enterBtn} onClick={handleEnter}>
                  {t("welcomeEnter")}
                </PixelButton>
                <div className={styles.authLinks}>
                  <span className={styles.authOr}>{t("authOr")}</span>
                  <PixelButton variant="ghost" size="sm" onClick={() => setAuthOpen(true, "login")}>
                    {t("authLogin")}
                  </PixelButton>
                  <span className={styles.authSep}>/</span>
                  <PixelButton variant="ghost" size="sm" onClick={() => setAuthOpen(true, "register")}>
                    {t("authRegister")}
                  </PixelButton>
                </div>
                <div className={styles.controls}>
                  {isMobile ? t("welcomeControlsMobile") : t("welcomeControls")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PixelFadeIn>
    </div>
  );
}
