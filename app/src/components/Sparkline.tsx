type Props = {
  values: number[]
  width?: number
  height?: number
  className?: string
}

/** Minimal SVG sparkline; values are 0–100 health scores. */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  className = '',
}: Props) {
  if (values.length === 0) return null
  const pad = 2
  const w = width - pad * 2
  const h = height - pad * 2
  const min = 0
  const max = 100
  const n = values.length
  const points = values.map((v, i) => {
    const x = pad + (n === 1 ? w / 2 : (i / (n - 1)) * w)
    const y = pad + h - ((v - min) / (max - min)) * h
    return `${x},${y}`
  })
  const d = `M ${points.join(' L ')}`
  return (
    <svg
      className={`sparkline ${className}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path
        className="sparkline__path"
        d={d}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
