interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 22, className }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer tongue-flame — wide base (tongue root), curving asymmetrically to a flame tip */}
      <path
        d="M8.5 20C7.2 19 6 17 6 14.5C6 11.5 8 8 10 5.5C11 4 11.8 3 12 2.5C12.2 3 13.2 4.5 14 6C15.5 8.5 18 12 18 15C18 17.5 16.5 19.5 15 20.5C13.8 21.3 12.5 21.5 11.5 21.2C10.3 20.8 9.3 20.5 8.5 20Z"
        fill="currentColor"
        opacity="0.3"
      />

      {/* Inner tongue-flame — bright core with tongue-like curve */}
      <path
        d="M10 19C9.2 18.3 8.5 17 8.5 15.5C8.5 13.2 10 10.5 11.2 8.5C11.8 7.5 12 7 12 7C12 7 12.5 8 13 9C14 11 15.5 13.5 15.5 15.8C15.5 17.5 14.5 19 13.5 19.5C12.7 19.9 11.8 19.8 11 19.5C10.6 19.4 10.3 19.2 10 19Z"
        fill="currentColor"
        opacity="0.7"
      />

      {/* Bright core — the hot center */}
      <path
        d="M11 17.5C10.6 17.1 10.5 16.5 10.5 16C10.5 14.8 11.2 13 11.8 12C12 11.6 12 11.5 12 11.5C12 11.5 12.2 12 12.5 12.5C13 13.5 13.5 14.8 13.5 16C13.5 16.8 13.2 17.3 12.8 17.6C12.4 17.9 11.8 17.9 11.4 17.7C11.2 17.6 11.1 17.6 11 17.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
