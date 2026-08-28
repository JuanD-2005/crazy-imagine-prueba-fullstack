import { useCallback, useState, type CSSProperties, type MouseEvent } from 'react'

type SpotlightUnit = 'percent' | 'px'

interface SpotlightStyle extends CSSProperties {
  '--mx'?: string
  '--my'?: string
}

/**
 * Sigue al mouse dentro del elemento y expone --mx/--my como CSS custom
 * properties (equivalente React del `element.style.setProperty('--mx', …)`
 * que usaban los mocks a mano). 'percent' es para efectos de fondo grandes
 * (brand panel del login), 'px' para efectos acotados al propio elemento
 * (spotlight de cada fila de la lista de tickets).
 */
export function useMouseSpotlight(unit: SpotlightUnit = 'percent') {
  const [style, setStyle] = useState<SpotlightStyle>({})

  const onMouseMove = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      if (unit === 'percent') {
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        setStyle({ '--mx': `${x}%`, '--my': `${y}%` })
      } else {
        setStyle({
          '--mx': `${event.clientX - rect.left}px`,
          '--my': `${event.clientY - rect.top}px`,
        })
      }
    },
    [unit],
  )

  return { style, onMouseMove }
}
