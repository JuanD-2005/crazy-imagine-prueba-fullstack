import logoSrc from '../assets/crazy_logo.png'

export function LogoMark({ className = 'h-[22px] w-[22px]' }: { className?: string }) {
  return <img src={logoSrc} alt="CrazySupportHub" className={`object-contain ${className}`} />
}

export function LogoWordmark({ className = 'text-[17px]' }: { className?: string }) {
  return (
    <span className={`font-heading font-semibold tracking-tight text-[#f2f4ee] ${className}`}>
      Crazy<b className="font-semibold text-neon">Support</b>Hub
    </span>
  )
}
