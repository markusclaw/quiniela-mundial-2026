import type { SVGProps } from "react";

/** A simple soccer-ball icon (lucide has none in this version). */
export function SoccerBall(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="9.5" />
      <polygon points="12 8 15.2 10.3 14 14 10 14 8.8 10.3" />
      <path d="M12 8V2.6" />
      <path d="M15.2 10.3 20.6 8.6" />
      <path d="M14 14 17.6 18.6" />
      <path d="M10 14 6.4 18.6" />
      <path d="M8.8 10.3 3.4 8.6" />
    </svg>
  );
}
