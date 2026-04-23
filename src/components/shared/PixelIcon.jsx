import styles from "./PixelIcon.module.css";

const SIZE_MAP = {
  sm: "var(--icon-sm)",
  md: "var(--icon-md)",
  lg: "var(--icon-lg)",
};

export default function PixelIcon({ name, size = "lg", className = "" }) {
  const s = SIZE_MAP[size] || SIZE_MAP.lg;
  return (
    <span
      className={`${styles.icon} ${className}`}
      style={{
        width: s,
        height: s,
        minWidth: s,
        minHeight: s,
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskImage: `url(/icons/${name}.svg)`,
      }}
    />
  );
}
