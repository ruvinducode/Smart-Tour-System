import { useEffect, useRef } from 'react'
import slMap from '../../mapicons/Map.png'
import carImage from '../../mapicons/mapcar2.png'

/**
 * VERTICAL STRETCH CALIBRATION:
 * Increasing the height of the map and path to fill the vertical space.
 * The viewBox is now taller (350x650) to allow for a majestic long-form map.
 */

// Heavily shrunk path to ensure the vehicle stays strictly on the visible landmass
const SL_PATH = `M240,190 C267,186 310,200 333,227 C345,250 350,285 337,326 C325,357 318,390 282,408 C263,415 216,415 189,408 C158,390 142,357 134,326 C126,285 134,250 154,227 C181,200 212,186 240,190 Z`

const CITIES = [
  { x: 158, y: 326, name: 'Colombo', color: '#34d399' },
  { x: 240, y: 194, name: 'Jaffna', color: '#60a5fa' },
  { x: 244, y: 288, name: 'Kandy', color: '#f472b6' },
]

export default function SriLankaMap() {
  const carRef = useRef(null)
  const pathRef = useRef(null)
  const progressRef = useRef(0)

  useEffect(() => {
    let rafId
    const speed = 0.0003

    const animate = () => {
      progressRef.current -= speed
      if (progressRef.current < 0) progressRef.current = 1

      const path = pathRef.current
      const car = carRef.current
      if (!path || !car) { 
        rafId = requestAnimationFrame(animate)
        return 
      }

      const totalLen = path.getTotalLength()
      const pt = path.getPointAtLength(progressRef.current * totalLen)
      
      // When moving backwards ( -= speed ), the point "ahead" in our travel direction is actually smaller on the path
      let aheadProgress = progressRef.current - 0.005
      if (aheadProgress < 0) aheadProgress += 1
      const ptAhead = path.getPointAtLength(aheadProgress * totalLen)
      
      const isMovingLeft = ptAhead.x < pt.x
      
      // If mapcar2.png natively faces left:
      // When moving left, we DO NOT flip (scale 1)
      // When moving right, we DO flip (scale -1)
      car.setAttribute('transform', `translate(${pt.x}, ${pt.y}) scale(${isMovingLeft ? '1' : '-1'}, 1)`)
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg 
        viewBox="0 0 480 700" 
        className="w-full h-full drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Map Image - Reset to fully visible and centered */}
        <image 
          href={slMap} 
          x="0" 
          y="0" 
          width="480" 
          height="700" 
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Hidden path */}
        <path 
          ref={pathRef} 
          d={SL_PATH} 
          fill="none" 
          stroke="none" 
        />

        {/* City dots */}
        {CITIES.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="7" fill={c.color} opacity="0.5" />
            <circle cx={c.x} cy={c.y} r="4.5" fill={c.color} filter="url(#glow)" />
            <text 
              x={c.x + 14} 
              y={c.y + 6} 
              fill="white" 
              fontSize="17" 
              fontWeight="900"
              className="select-none pointer-events-none"
              style={{ textShadow: '0 3px 10px rgba(0,0,0,1)' }}
            >
              {c.name}
            </text>
          </g>
        ))}

        {/* Vehicle image */}
        <g ref={carRef}>
          <image 
            href={carImage} 
            x="-40" 
            y="-28" 
            width="80" 
            height="56" 
            style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.7))' }}
          />
        </g>
      </svg>
    </div>
  )
}
