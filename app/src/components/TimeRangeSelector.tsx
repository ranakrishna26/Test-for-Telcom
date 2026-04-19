import type { TimeRangePreset } from '../types'

const OPTIONS: { value: TimeRangePreset; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

type Props = {
  value: TimeRangePreset
  onChange: (preset: TimeRangePreset) => void
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <div className="time-range" role="group" aria-label="Time range">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`time-range__btn${value === opt.value ? ' time-range__btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
