import type { LucideIcon } from 'lucide-react'
import {
  AudioLines,
  ClipboardList,
  Clock,
  Feather,
  Keyboard,
  MessageSquareText,
  Mic,
  Music,
} from 'lucide-react'

type DoodlePlacement = [
  top: number,
  left: number,
  icon: string,
  rotation: number,
  size: number,
]

const icons: Record<string, LucideIcon> = {
  mic: Mic,
  waves: AudioLines,
  clipboard: ClipboardList,
  feather: Feather,
  bubble: MessageSquareText,
  keyboard: Keyboard,
  music: Music,
  clock: Clock,
}

const placements: DoodlePlacement[] = [
  [1, 2, 'mic', 14, 40],
  [3, 22, 'waves', -7, 36],
  [2, 42, 'bubble', 11, 38],
  [4, 62, 'feather', -16, 36],
  [1, 82, 'music', 9, 40],
  [10, 8, 'keyboard', 19, 36],
  [12, 28, 'clipboard', -4, 38],
  [11, 48, 'mic', 9, 40],
  [13, 68, 'bubble', -11, 36],
  [10, 88, 'waves', 6, 38],
  [19, 1, 'feather', -9, 38],
  [21, 18, 'music', 17, 36],
  [20, 38, 'keyboard', -6, 40],
  [22, 58, 'waves', 12, 36],
  [19, 78, 'clipboard', -13, 38],
  [21, 95, 'mic', 8, 36],
  [28, 6, 'bubble', 13, 38],
  [30, 26, 'feather', -5, 36],
  [29, 46, 'music', 16, 40],
  [31, 66, 'keyboard', -10, 36],
  [28, 86, 'mic', 7, 38],
  [37, 3, 'clipboard', -17, 36],
  [39, 22, 'waves', 8, 38],
  [38, 42, 'bubble', -6, 40],
  [40, 62, 'feather', 14, 36],
  [37, 82, 'music', -9, 36],
  [39, 96, 'keyboard', 11, 38],
  [46, 8, 'mic', 7, 38],
  [48, 28, 'keyboard', -14, 36],
  [47, 48, 'clipboard', 12, 40],
  [49, 68, 'bubble', -5, 36],
  [46, 88, 'feather', 10, 38],
  [55, 1, 'waves', -11, 36],
  [57, 18, 'music', 14, 38],
  [56, 38, 'mic', -9, 40],
  [58, 58, 'clipboard', 7, 36],
  [55, 78, 'keyboard', -13, 38],
  [57, 94, 'bubble', 8, 36],
  [64, 6, 'feather', -8, 38],
  [66, 26, 'waves', 13, 36],
  [65, 46, 'clock', -6, 40],
  [67, 66, 'music', 11, 36],
  [64, 86, 'mic', -14, 38],
  [73, 3, 'keyboard', 8, 36],
  [75, 22, 'clipboard', -15, 38],
  [74, 42, 'feather', 12, 36],
  [76, 62, 'waves', -7, 40],
  [73, 82, 'bubble', 10, 36],
  [75, 96, 'music', -11, 38],
  [82, 8, 'music', -9, 38],
  [84, 28, 'mic', 13, 36],
  [83, 48, 'keyboard', -6, 40],
  [85, 68, 'feather', 11, 36],
  [82, 88, 'clipboard', -14, 38],
  [91, 1, 'bubble', 7, 36],
  [93, 20, 'waves', -12, 38],
  [92, 40, 'clock', 15, 36],
  [94, 60, 'mic', -8, 40],
  [91, 80, 'keyboard', 11, 36],
  [93, 95, 'feather', -10, 38],
]

export function DoodleBackground({ opacity = 0.1 }: { opacity?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {placements.map(([top, left, icon, rot, size], i) => {
        const Icon = icons[icon]
        return (
          <Icon
            key={i}
            className="absolute text-primary"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              transform: `rotate(${rot}deg)`,
              opacity,
            }}
            strokeWidth={1.3}
          />
        )
      })}
    </div>
  )
}
