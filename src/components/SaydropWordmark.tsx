/** Saydrop wordmark: a drop with a short sound wave inside, plus the name. */
export function SaydropWordmark({ className }: { className?: string }) {
  return (
    <span className={className ?? "logo-wordmark"}>
      <svg
        className="logo-wordmark-mark"
        viewBox="0 0 16 20"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="logo-wordmark-drop"
          d="M8 1C8 1 2 8 2 12.5C2 16.1 4.7 19 8 19C11.3 19 14 16.1 14 12.5C14 8 8 1 8 1Z"
        />
        <path
          className="logo-wordmark-wave"
          d="M5.5 12.5V14M8 10.5V16M10.5 12V14.5"
        />
      </svg>
      <span className="logo-wordmark-text">Saydrop</span>
    </span>
  );
}
