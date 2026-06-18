import type { Severity } from '../types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const styles: Record<Severity, string> = {
  critical: 'border-red-500/40 bg-red-500/15 text-red-300',
  major: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  minor: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
}

type Props = {
  severity: Severity
  className?: string
}

export function SeverityBadge({ severity, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-semibold capitalize', styles[severity], className)}
    >
      {severity}
    </Badge>
  )
}
