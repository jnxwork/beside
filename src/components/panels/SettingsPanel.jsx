import { useState, useRef, useEffect } from "react";
import { PixelButton, PixelSlider, PixelTooltip, PixelCheckbox, PixelSelect } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import useSettingsStore from "../../stores/settingsStore.js";
import useAuthStore from "../../stores/authStore.js";
import { useT, setLang, getLang } from "../../i18n/index.js";
import PixelIcon from "../shared/PixelIcon.jsx";
import styles from "./SettingsPanel.module.css";

export default function SettingsPanel() {
  const t = useT();
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  const volume = useSettingsStore((s) => s.volume);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const fontPixel = useSettingsStore((s) => s.fontPixel);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setFontPixel = useSettingsStore((s) => s.setFontPixel);

  const showNames = useSettingsStore((s) => s.showNames);
  const setShowNames = useSettingsStore((s) => s.setShowNames);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const authEmail = useAuthStore((s) => s.authEmail);

  const isRecording = useUiStore((s) => s.isRecording);
  const recProcessing = useUiStore((s) => s.recProcessing);
  const recTimeStr = useUiStore((s) => s.recTimeStr);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const justOpenedSettings = useRef(false);
  const justOpenedProfile = useRef(false);
  const justOpenedCapture = useRef(false);

  const profileRef = useRef(null);
  const panelRef = useRef(null);
  const settingsDetailRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const profileMenuRef = useRef(null);
  const captureMenuRef = useRef(null);

  useEffect(() => {
    if (!settingsOpen) return;

    // Skip adding listener if we just opened (avoid closing on same click)
    if (justOpenedSettings.current) {
      justOpenedSettings.current = false;
      return;
    }

    const handleClick = (e) => {
      const clickedDetail = settingsDetailRef.current?.contains(e.target);
      const clickedButton = settingsButtonRef.current?.contains(e.target);

      if (!clickedDetail && !clickedButton) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    if (justOpenedProfile.current) {
      justOpenedProfile.current = false;
      return;
    }

    const handleClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!captureMenuOpen) return;

    if (justOpenedCapture.current) {
      justOpenedCapture.current = false;
      return;
    }

    const handleClick = (e) => {
      if (captureMenuRef.current && !captureMenuRef.current.contains(e.target)) {
        setCaptureMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [captureMenuOpen]);

  const toggleLang = () => {
    const next = getLang() === "en" ? "zh" : "en";
    setLang(next);
    useSettingsStore.getState().setLang(next);
    window.__onLangChange?.(next);
  };

  const toggleShowName = (key) => {
    const next = { ...showNames, [key]: !showNames[key] };
    // Prevent turning all off — keep at least one on
    if (!next.self && !next.followed && !next.others) return;
    setShowNames(next);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (window.__onSoundToggle) window.__onSoundToggle(!soundEnabled);
  };

  const handleLogout = () => {
    if (window.__onLogout) window.__onLogout();
    setSettingsOpen(false);
  };

  const handleSettingsToggle = () => {
    if (!settingsOpen) {
      justOpenedSettings.current = true;
      setSettingsOpen(true);
      setProfileMenuOpen(false);
      setCaptureMenuOpen(false);
    } else {
      setSettingsOpen(false);
    }
  };

  const handleProfileToggle = () => {
    if (!profileMenuOpen) {
      justOpenedProfile.current = true;
      setProfileMenuOpen(true);
      setSettingsOpen(false);
      setCaptureMenuOpen(false);
    } else {
      setProfileMenuOpen(false);
    }
  };

  const handleCaptureToggle = () => {
    if (!captureMenuOpen) {
      justOpenedCapture.current = true;
      setCaptureMenuOpen(true);
      setSettingsOpen(false);
      setProfileMenuOpen(false);
    } else {
      setCaptureMenuOpen(false);
    }
  };

  return (
    <aside className={styles.panel} ref={panelRef} aria-label="Settings">
      <nav className={styles.launchers} aria-label="Tools">
        {isRecording && (
          <span className={styles.recTimer}>
            <span className={styles.recDot} />
            {recTimeStr}
          </span>
        )}

        {/* Capture menu */}
        <PixelTooltip content="Capture" position="bottom">
          <button
            className={`${styles.iconBtn} ${captureMenuOpen ? styles.iconBtnActive : ""} ${isRecording ? styles.iconBtnRecording : ""}`}
            onClick={handleCaptureToggle}
            disabled={recProcessing}
            aria-label="Capture"
            aria-expanded={captureMenuOpen}
          >
            <span className={styles.iconInner}><PixelIcon name={isRecording ? "square" : "camera"} /></span>
          </button>
        </PixelTooltip>

        {captureMenuOpen && (
          <div className={styles.captureMenu} ref={captureMenuRef}>
            <button
              className={styles.menuItem}
              onClick={() => {
                window.__onRecToggle?.();
                setCaptureMenuOpen(false);
              }}
              disabled={recProcessing}
            >
              <PixelIcon name={isRecording ? "square" : "video"} />
              <span>{recProcessing ? "Encoding..." : isRecording ? t("recStop") : t("recStart")}</span>
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                window.__onScreenshot?.();
                setCaptureMenuOpen(false);
              }}
            >
              <PixelIcon name="camera" />
              <span>{t("screenshot")}</span>
            </button>
          </div>
        )}

        {/* Mini Window */}
        <PixelTooltip content={t("miniOpen")} position="bottom">
          <button
            className={styles.iconBtn}
            onClick={() => window.__onMiniPip?.()}
            aria-label={t("miniOpen")}
          >
            <span className={styles.iconInner}><PixelIcon name="pip" /></span>
          </button>
        </PixelTooltip>
        <PixelTooltip content={t("previewCard")} position="bottom">
          <button
            className={`${styles.iconBtn} ${profileMenuOpen ? styles.iconBtnActive : ""}`}
            onClick={handleProfileToggle}
            aria-label={t("previewCard")}
            aria-expanded={profileMenuOpen}
          >
            <span ref={profileRef} className={styles.profileIcon} id="profile-icon-react" />
          </button>
        </PixelTooltip>

        {profileMenuOpen && (
          <div className={styles.profileMenu} ref={profileMenuRef}>
            <button
              className={styles.menuItem}
              onClick={() => {
                useUiStore.getState().setWelcomeOpen(true, 2);
                setProfileMenuOpen(false);
              }}
            >
              <PixelIcon name="clipboard-note" />
              <span>{t("previewCard")}</span>
            </button>
            <button
              className={styles.menuItem}
              onClick={() => {
                window.__onRecapOpen?.();
                setProfileMenuOpen(false);
              }}
            >
              <PixelIcon name="chart" />
              <span>{t("recapTitle")}</span>
            </button>
          </div>
        )}
        <PixelTooltip content={t("settingsTitle")} position="bottom">
          <button
            ref={settingsButtonRef}
            className={`${styles.iconBtn} ${settingsOpen ? styles.iconBtnActive : ""}`}
            onClick={handleSettingsToggle}
            aria-label={t("settingsTitle")}
            aria-expanded={settingsOpen}
          >
            <span className={styles.iconInner}><PixelIcon name="settings-cog" /></span>
          </button>
        </PixelTooltip>
      </nav>

      {settingsOpen && (
        <section className={styles.detail} ref={settingsDetailRef}>
          {/* Account */}
          {/* Hidden until registration feature */}

          <div className={styles.section}>
            <div className={styles.settingRow}>
              <label className={styles.settingLabel}>{t("uiLangLabel")}</label>
              <PixelSelect
                value={getLang()}
                onChange={(newValue) => {
                  setLang(newValue);
                  useSettingsStore.getState().setLang(newValue);
                  window.__onLangChange?.(newValue);
                }}
                options={[
                  { value: "en", label: "English" },
                  { value: "zh", label: "简体中文" }
                ]}
                size="sm"
              />
            </div>

            <div className={styles.settingRow}>
              <label className={styles.settingLabel}>{t("soundLabel")}</label>
              <div className={`${styles.soundControl} ${!soundEnabled ? styles.soundMuted : ""}`}>
                <PixelCheckbox
                  label={t("muteLabel")}
                  checked={!soundEnabled}
                  onChange={() => toggleSound()}
                />
                <PixelSlider
                  label=""
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(val) => {
                    setVolume(val);
                    window.__onVolumeChange?.(val);
                  }}
                  tone="gold"
                />
              </div>
            </div>

            <div className={styles.settingRow}>
              <label className={styles.settingLabel}>{t("showNamesLabel")}</label>
              <div className={styles.namesToggles}>
                <PixelCheckbox
                  label={t("showNamesSelf")}
                  checked={showNames.self}
                  onChange={() => toggleShowName("self")}
                />
                <PixelCheckbox
                  label={t("showNamesFollowed")}
                  checked={showNames.followed}
                  onChange={() => toggleShowName("followed")}
                />
                <PixelCheckbox
                  label={t("showNamesOthers")}
                  checked={showNames.others}
                  onChange={() => toggleShowName("others")}
                />
              </div>
            </div>

            <div className={styles.settingRow}>
              <label className={styles.settingLabel}>{t("smoothFontLabel")}</label>
              <PixelCheckbox
                label=""
                checked={!fontPixel}
                onChange={() => {
                  setFontPixel(!fontPixel);
                  window.__onFontChange?.(!fontPixel);
                }}
              />
            </div>
          </div>

          <div className={styles.credits}>
            Assets by <a href="https://limezu.itch.io" target="_blank" rel="noopener noreferrer">limezu</a> · <a href="https://pop-shop-packs.itch.io" target="_blank" rel="noopener noreferrer">Pop Shop Packs</a> · <a href="https://pxlkit.xyz/" target="_blank" rel="noopener noreferrer">pxlkit</a>
          </div>
        </section>
      )}
    </aside>
  );
}
