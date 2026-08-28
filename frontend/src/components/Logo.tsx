export function LogoMark({ className = 'h-[22px] w-[22px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L3 7v6c0 5 4 8.5 9 9 5-.5 9-4 9-9V7l-9-5z"
        stroke="var(--color-neon)"
        strokeWidth="1.4"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="var(--color-neon)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LogoWordmark({ className = 'text-[17px]' }: { className?: string }) {
  return (
    <span className={`font-heading font-semibold tracking-tight text-[#f2f4ee] ${className}`}>
      Crazy<b className="font-semibold text-neon">Support</b>Hub
    </span>
  )
}
