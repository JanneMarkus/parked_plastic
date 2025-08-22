// /components/PlaceholderDisc.js
export default function PlaceholderDisc({ className = "", label = "No image" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Disc background */}
      <circle cx="200" cy="150" r="120" fill="#F8F7EC" stroke="#141B4D" strokeWidth="6" />

      {/* Center text */}
      <text
        x="200"
        y="160"
        textAnchor="middle"
        fontFamily="Poppins, var(--font-poppins), system-ui, sans-serif"
        fontWeight="600"
        fontSize="28"
        fill="#141B4D"
      >
        No image
      </text>
    </svg>
  );
}
