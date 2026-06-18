import type { TimeRangePreset } from '../types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="group" aria-label="Time range">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={value === opt.value ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-3 text-xs',
            value === opt.value && 'bg-background shadow-sm',
          )}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
