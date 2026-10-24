import { forwardRef, useId } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowUUpLeft,
  Backpack,
  Bandaids,
  CaretLeft,
  ChatCircleText,
  Crown,
  Drop,
  Lightbulb,
  Lightning,
  Pause,
  SealCheck,
  SprayBottle,
  Snowflake,
  Television,
  Toilet,
  Towel,
  User,
  Wrench,
  X,
} from '@phosphor-icons/react'
import type { Icon, IconProps } from '@phosphor-icons/react'
import { AWAY_LABEL, ISSUE_LABEL, QUICK_NOTES, SEND_BACK_LABEL, glueTimes } from './data'
import type { AwayReason, IssueKind, Room } from './data'
import { fmtTime, isWaiting, minutes } from './store'
import { motion } from 'motion/react'
import { fade, glide } from './motion'

export const ISSUE_ICON: Record<IssueKind, Icon> = {
  ac: Snowflake,
  water: Drop,
  toilet: Toilet,
  power: Lightbulb,
  tv: Television,
  other: Wrench,
}

/** A badge is a glance, not a paragraph: the full note is in the room's log. */
const clip = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** Quick notes get an icon so they're picked by shape, not read. Neutral on purpose: colour means a status here. */
export const NOTE_ICON: Record<(typeof QUICK_NOTES)[number], Icon> = {
  'Lost and found item': Backpack,
  'Guest asked for extra towels': Towel,
  'Stain or damage': Bandaids,
  'Needs a deep clean': SprayBottle,
}

/**
 * The sign a guest hangs on the handle: a tall tag with a hole for the knob and a slit from the side to slip it on, and a
 * "no entry" circle on it so it reads as do not disturb, not any sign. The marks are cut out of the tag, like
 * Phosphor's fill icons. Phosphor has no door hanger, so this one follows its 256 grid and only draws the fill weight.
 */
const DoorHanger = forwardRef<SVGSVGElement, IconProps>(function DoorHanger(
  { size = '1em', color = 'currentColor', weight: _weight, mirrored: _mirrored, children, ...rest },
  ref,
) {
  const mask = `hanger-${useId().replace(/[^\w-]/g, '')}`
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill={color} {...rest}>
      {children}
      <mask id={mask}>
        <path fill="#fff" d="M76 8h104a24 24 0 0 1 24 24v192a24 24 0 0 1-24 24H76a24 24 0 0 1-24-24V32a24 24 0 0 1 24-24Z" />
        <path fill="#000" d="M0 63h97.3a32 32 0 1 1 0 18H0Z" />
        <g fill="none" stroke="#000" strokeWidth={12}>
          <circle cx={128} cy={146} r={22} />
          <path d="M112.4 130.4l31.2 31.2" />
        </g>
        {/* The printed words, half cut out so they stay quieter than the symbol. */}
        <g fill="#808080">
          <rect x={88} y={188} width={80} height={12} rx={6} />
          <rect x={102} y={210} width={52} height={12} rx={6} />
        </g>
      </mask>
      <rect width={256} height={256} mask={`url(#${mask})`} />
    </svg>
  )
}) as Icon

export const AWAY_ICON: Record<AwayReason, Icon> = { dnd: DoorHanger, guest: User }

/** The dimmed layer behind a sheet. A screen that swaps one sheet for another renders it once, so it stays put. */
export function Backdrop({ onClose }: { onClose: () => void }) {
  return <motion.div className="scrim-bg" onClick={onClose} aria-hidden {...fade} />
}

/**
 * A bottom sheet. Render it inside <AnimatePresence> so it can slide away on close. `step` names the page
 * inside a multi-step sheet: changing it fades the new page in, while the sheet itself stays put.
 * With `ownBackdrop={false}` the screen provides a shared <Backdrop> instead.
 */
export function Sheet({
  title,
  children,
  onClose,
  onBack,
  step,
  ownBackdrop = true,
}: {
  title: ReactNode
  children: ReactNode
  onClose: () => void
  onBack?: () => void
  step?: string
  ownBackdrop?: boolean
}) {
  return (
    // The backdrop fades on its own layer, so the sheet sliding over it stays fully opaque.
    <motion.div className={`scrim ${ownBackdrop ? '' : 'scrim-shared'}`} onClick={onClose}>
      {ownBackdrop && <Backdrop onClose={onClose} />}
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: glide }}
        exit={{ y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
      >
        <div className="grabber" aria-hidden />
        <div className="sheet-head">
          {onBack && (
            <button className="icon-btn" onClick={onBack} aria-label="Back">
              <CaretLeft size={22} weight="bold" />
            </button>
          )}
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
        </div>
        <motion.div key={step} className="sheet-body" initial={step ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export function Avatar({ initials, tone }: { initials: string; tone: 'maya' | 'jordan' | 'other' }) {
  return <span className={`avatar av-${tone}`}>{initials}</span>
}

/** Room number set like the plate on the door: the one thing a housekeeper scans for. */
export function Plate({ room, size = 'md', tone }: { room: Room; size?: 'sm' | 'md' | 'xl'; tone?: string }) {
  return <span className={`plate plate-${size} ${tone ?? ''}`}>{room.number}</span>
}

type BadgeTone = 'rush' | 'away' | 'issue' | 'paused' | 'vip' | 'done' | 'back'

export function Badge({ tone, icon: I, children }: { tone: BadgeTone; icon: Icon; children: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      <I size={14} weight="fill" aria-hidden />
      <span className="badge-text">{typeof children === 'string' ? glueTimes(children) : children}</span>
    </span>
  )
}

/**
 * Only what changes what the housekeeper does next, most important first.
 * Rows show just the top one (the room sheet shows everything), so a row never turns into a stack of pills.
 */
export function RoomBadges({
  room,
  now,
  limit,
  hidePaused,
  hideReminders,
}: {
  room: Room
  now: number
  limit?: number
  hidePaused?: boolean
  /** The live card lists these under "Before you finish" instead. */
  hideReminders?: boolean
}) {
  const badges: ReactNode[] = []
  if (room.sentBack && !hideReminders)
    badges.push(
      <Badge key="back" tone="back" icon={ArrowUUpLeft}>
        Sent back: {SEND_BACK_LABEL[room.sentBack].toLowerCase()}
      </Badge>,
    )
  if (room.status === 'away')
    badges.push(
      isWaiting(room, now) ? (
        <Badge key="away" tone="away" icon={AWAY_ICON[room.awayReason!]}>
          {AWAY_LABEL[room.awayReason!]}, retry {fmtTime(room.awayUntil!)}
        </Badge>
      ) : (
        <Badge key="away" tone="rush" icon={AWAY_ICON[room.awayReason!]}>
          Try the door again
        </Badge>
      ),
    )
  if (room.rush && room.status !== 'done')
    badges.push(
      <Badge key="rush" tone="rush" icon={Lightning}>
        {room.rush}
      </Badge>,
    )
  room.issues.forEach((i) =>
    badges.push(
      <Badge key={i.id} tone="issue" icon={ISSUE_ICON[i.kind]}>
        {i.kind === 'other' && i.note ? clip(i.note) : `${ISSUE_LABEL[i.kind]} reported`}
      </Badge>,
    ),
  )
  if (room.vip && !hideReminders)
    badges.push(
      <Badge key="vip" tone="vip" icon={Crown}>
        {room.vip}
      </Badge>,
    )
  if (room.request && room.status !== 'done' && !hideReminders)
    badges.push(
      <Badge key="request" tone="vip" icon={ChatCircleText}>
        Guest asked: {room.request.toLowerCase()}
      </Badge>,
    )
  // The Resume button and the card header already say "paused"; the sheet is the only place this adds anything.
  if (room.status === 'paused' && !hidePaused)
    badges.push(
      <Badge key="paused" tone="paused" icon={Pause}>
        Paused after {minutes(room.elapsedMs)} min
      </Badge>,
    )
  if (room.status === 'done' && room.inspected)
    badges.push(
      <Badge key="ok" tone="done" icon={SealCheck}>
        Inspected
      </Badge>,
    )
  if (!badges.length) return null
  return <div className="badges">{limit ? badges.slice(0, limit) : badges}</div>
}

/**
 * What this particular room needs beyond the routine clean. The routine lives in training and on the cart;
 * only what changes room to room is worth showing, and only while there's still time to do it.
 */
export function reminders(room: Room): { key: string; icon: Icon; text: string }[] {
  const items: { key: string; icon: Icon; text: string }[] = []
  if (room.sentBack) items.push({ key: 'back', icon: ArrowUUpLeft, text: `Recheck: ${SEND_BACK_LABEL[room.sentBack].toLowerCase()}` })
  if (room.request) items.push({ key: 'request', icon: ChatCircleText, text: `Guest asked: ${room.request.toLowerCase()}` })
  if (room.vip) items.push({ key: 'vip', icon: Crown, text: room.vip })
  return items
}

/** One segment per room: the whole shift at a glance. */
export function ShiftStrip({ rooms, now }: { rooms: Room[]; now: number }) {
  const order = { done: 0, cleaning: 1, paused: 2, todo: 3, away: 4 } as const
  const sorted = [...rooms].sort((a, b) => order[a.status] - order[b.status])
  return (
    <div className="strip" aria-hidden>
      {sorted.map((r) => (
        <i key={r.id} className={`seg seg-${r.status} ${isWaiting(r, now) ? 'seg-waiting' : ''}`} />
      ))}
    </div>
  )
}
