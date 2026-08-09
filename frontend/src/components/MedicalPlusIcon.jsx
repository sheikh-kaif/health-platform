export default function MedicalPlusIcon({ size = 96, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={`medical-plus-glow ${className}`}
      role="img"
      aria-label="Medical cross"
    >
      <circle
        cx="48"
        cy="48"
        r="44"
        fill="var(--color-brand-50)"
        stroke="var(--color-brand-200, var(--color-brand-100))"
        strokeWidth="2"
      />
      <rect
        x="40"
        y="20"
        width="16"
        height="56"
        rx="6"
        fill="var(--color-brand-600)"
      />
      <rect
        x="20"
        y="40"
        width="56"
        height="16"
        rx="6"
        fill="var(--color-brand-600)"
      />
    </svg>
  );
}
