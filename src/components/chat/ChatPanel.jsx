import { useRef, useEffect, useState } from "react";
import { PixelButton, PixelBadge } from "@pxlkit/ui-kit";
import useChatStore from "../../stores/chatStore.js";
import useUiStore from "../../stores/uiStore.js";
import { useT } from "../../i18n/index.js";
import styles from "./ChatPanel.module.css";
import { PROFESSION_COLORS } from "../../constants.js";

const TABS = [
  { key: "all", i18nKey: "chatAll" },
  { key: "room", i18nKey: "chatRoom" },
  { key: "nearby", i18nKey: "chatNearby" },
];

const SCOPES = ["room", "nearby"];

export default function ChatPanel() {
  const t = useT();
  const messages = useChatStore((s) => s.messages);
  const activeTab = useChatStore((s) => s.activeTab);
  const chatScope = useChatStore((s) => s.chatScope);
  const chatCollapsed = useChatStore((s) => s.chatCollapsed);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const setChatScope = useChatStore((s) => s.setChatScope);
  const setChatCollapsed = useChatStore((s) => s.setChatCollapsed);
  const setUnreadCount = useChatStore((s) => s.setUnreadCount);
  const unreadCount = useChatStore((s) => s.unreadCount);

  const setPlayerCardTarget = useUiStore((s) => s.setPlayerCardTarget);
  const [input, setInput] = useState("");
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);
  const inputBarRef = useRef(null);
  const nearbyHintShown = useRef(false);
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Enter key → focus input ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Enter") return;
      if (document.activeElement && document.activeElement !== document.body) return;
      e.preventDefault();
      if (chatCollapsed) {
        setChatCollapsed(false);
        setUnreadCount(0);
      }
      const el = inputBarRef.current?.querySelector("input");
      if (el) el.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatCollapsed, setChatCollapsed, setUnreadCount]);

  const showNearbyHint = () => {
    if (nearbyHintShown.current) return;
    nearbyHintShown.current = true;
    addMessage({ type: "system", scope: "nearby", text: t("nearbyHint"), time: Date.now() });
  };

  const filtered = messages.filter((m) => {
    if (activeTab === "all") return true;
    if (activeTab === "room") return m.scope === "room" || (m.type === "system" && m.scope !== "nearby");
    if (activeTab === "nearby") return m.scope === "nearby" || m.type === "system";
    return true;
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (window.__onChatSend) window.__onChatSend(text, chatScope);
    setInput("");
  };

  const toggleCollapsed = () => {
    setChatCollapsed(!chatCollapsed);
    if (chatCollapsed) setUnreadCount(0);
  };

  const cycleSendScope = () => {
    const i = SCOPES.indexOf(chatScope);
    const next = SCOPES[(i + 1) % SCOPES.length];
    setChatScope(next);
    if (next === "nearby") showNearbyHint();
  };

  const fmtTime = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const channelPrefix = (msg) => {
    if (activeTab !== "all" || msg.type === "system") return null;
    const isNearby = msg.scope === "nearby";
    return (
      <span className={isNearby ? styles.prefixNearby : styles.prefixRoom}>
        [{isNearby ? t("chatNearby") : t("chatRoom")}]
      </span>
    );
  };

  const scopeIsNearby = chatScope === "nearby";

  return (
    <aside className={`${styles.wrap} ${styles.visible}`} aria-label="Chat">
      {chatCollapsed && (
        <PixelButton variant="ghost" size="sm" className={styles.toggle} onClick={toggleCollapsed}>
          {t("chat")}
          {unreadCount > 0 && (
            <PixelBadge tone="gold">{unreadCount}</PixelBadge>
          )}
        </PixelButton>
      )}
      <div className={`${styles.panel} ${chatCollapsed ? styles.collapsed : ""}`}>
        {/* Tabs + hide button */}
        <nav className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              onClick={() => { setActiveTab(tab.key); if (tab.key === "nearby") showNearbyHint(); }}
              type="button"
            >
              {t(tab.i18nKey)}
            </button>
          ))}
          <button className={styles.hideBtn} onClick={toggleCollapsed} type="button">
            {t("hide")}
          </button>
        </nav>

        {/* Messages */}
        <ul className={styles.messages} ref={messagesRef} role="log">
          {filtered.map((msg, i) => (
            <li key={i} className={`${styles.msg} ${msg.type === "system" ? styles.msgSystem : ""} ${msg.scope === "nearby" ? styles.msgNearby : ""}`}>
              {msg.time && <span className={styles.time}>[{fmtTime(msg.time)}]</span>}
              {msg.type === "system" ? (
                <><span className={styles.prefixSystem}>[{t("system")}]</span> {msg.text}</>
              ) : (
                <>
                  {channelPrefix(msg)}
                  <strong
                    className={`${styles.name} ${styles.nameClickable}`}
                    style={{ color: PROFESSION_COLORS[msg.profession] || PROFESSION_COLORS.mystery }}
                    onClick={(e) => {
                      if (msg.id) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPlayerCardTarget({ id: msg.id, x: rect.left + rect.width / 2, y: rect.top });
                      }
                    }}
                  >
                    [{msg.name}]
                  </strong>
                  {": "}
                  {msg.text}
                </>
              )}
            </li>
          ))}
          <li ref={bottomRef} aria-hidden="true" />
        </ul>

        {/* Input */}
        <div className={styles.inputBar} ref={inputBarRef}>
          <div className={`${styles.inputWrap} ${scopeIsNearby ? styles.wrapNearby : styles.wrapRoom}`}>
            <button
              className={`${styles.scopeLabel} ${scopeIsNearby ? styles.scopeNearby : styles.scopeRoom}`}
              onClick={cycleSendScope}
              type="button"
            >
              {t(`chat${chatScope.charAt(0).toUpperCase()}${chatScope.slice(1)}`)}:
            </button>
            <input
              className={styles.inputField}
              maxLength={200}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
