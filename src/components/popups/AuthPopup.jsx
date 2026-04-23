import { useState } from "react";
import { PixelModal, PixelInput, PixelPasswordInput, PixelButton } from "@pxlkit/ui-kit";
import useUiStore from "../../stores/uiStore.js";
import useAuthStore from "../../stores/authStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./AuthPopup.module.css";

export default function AuthPopup() {
  const t = useT();
  const authMode = useUiStore((s) => s.authMode);
  const setAuthOpen = useUiStore((s) => s.setAuthOpen);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError(t("authErrRequired"));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t("authErrInvalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("authErrShortPass"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const endpoint = authMode === "register" ? "/api/register" : "/api/login";
      const body = { email, password };
      if (authMode === "register") {
        body.authToken = localStorage.getItem("authToken") || undefined;
        body.name = localStorage.getItem("playerName") || "Anonymous";
        try {
          body.character = JSON.parse(localStorage.getItem("selectedCharacter") || "{}");
        } catch { body.character = {}; }
        body.tagline = localStorage.getItem("playerTagline") || "";
        try {
          body.languages = JSON.parse(localStorage.getItem("playerLanguages") || '["en"]');
        } catch { body.languages = ["en"]; }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error");
        setSubmitting(false);
        return;
      }

      login(data.token, email);
      if (window.__onAuthSuccess) {
        window.__onAuthSuccess(data.token, email, data.profile, data.focusRecords);
      }
      setAuthOpen(false);
    } catch {
      setError(t("authErrNetwork"));
    }
    setSubmitting(false);
  };

  return (
    <PixelModal
      open={true}
      title={authMode === "register" ? t("authRegister") : t("authLogin")}
      onClose={() => setAuthOpen(false)}
      size="sm"
    >
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <PixelInput
          type="email"
          placeholder={t("authEmail")}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          tone="gold"
        />
        <PixelPasswordInput
          placeholder={t("authPassword")}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          tone="gold"
        />
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.actions}>
          <PixelButton tone="gold" onClick={handleSubmit} disabled={submitting} loading={submitting}>
            {t("authSubmit")}
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setAuthOpen(false)}>
            {t("authBack")}
          </PixelButton>
        </div>
      </form>
    </PixelModal>
  );
}
