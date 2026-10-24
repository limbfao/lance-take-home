export type RoomKind = 'checkout' | 'stayover'
export type RoomStatus = 'todo' | 'cleaning' | 'paused' | 'away' | 'done'
export type AwayReason = 'dnd' | 'guest'
export type IssueKind = 'ac' | 'water' | 'toilet' | 'power' | 'tv' | 'other'
export type SendBackReason = 'bathroom' | 'bed' | 'floors' | 'amenities'

export interface LogEntry {
  at: number
  text: string
  note?: boolean
}

export interface Issue {
  id: string
  kind: IssueKind
  at: number
  photo?: string
  /** What's wrong, in her words. Only asked for "Something else": the other kinds say it with their icon. */
  note?: string
}

export interface Room {
  id: string
  number: string
  floor: number
  kind: RoomKind
  bed: string
  /** Why this room jumps the queue, set by the front desk. */
  rush?: string
  vip?: string
  /** Something a guest asked for, passed on by the front desk. */
  request?: string
  status: RoomStatus
  startedAt?: number
  elapsedMs: number
  awayReason?: AwayReason
  awayUntil?: number
  awayCount: number
  issues: Issue[]
  doneAt?: number
  inspected?: boolean
  sentBack?: SendBackReason
  /** Time from cleans that were sent back, so a redo starts its own clock but the day's total stays honest. */
  earlierMs?: number
  log: LogEntry[]
}

export type FeedKind = 'inspect' | 'issue' | 'away' | 'note' | 'info'

export interface FeedItem {
  id: string
  kind: FeedKind
  roomId: string
  at: number
  urgent?: boolean
  title: string
  detail: string
  photo?: string
  resolved?: string
}

export interface State {
  role: 'housekeeper' | 'supervisor'
  /** Simulated shift clock: added to Date.now() everywhere. */
  offset: number
  rooms: Room[]
  feed: FeedItem[]
}

export const PLANNED_MIN: Record<RoomKind, number> = { checkout: 30, stayover: 15 }

export const KIND_LABEL: Record<RoomKind, { title: string; guest: string }> = {
  checkout: { title: 'Full clean', guest: 'Checked out' },
  stayover: { title: 'Stayover tidy', guest: 'Guest staying' },
}

export const ISSUE_LABEL: Record<IssueKind, string> = {
  ac: 'AC or heat',
  water: 'Leak',
  toilet: 'Toilet or drain',
  power: 'Lights or power',
  tv: 'TV or Wi-Fi',
  other: 'Something else',
}

export const AWAY_LABEL: Record<AwayReason, string> = {
  dnd: 'Do not disturb',
  guest: 'Guest in room',
}

export const SEND_BACK_LABEL: Record<SendBackReason, string> = {
  bathroom: 'Bathroom',
  bed: 'Bed and linen',
  floors: 'Dust or floors',
  amenities: 'Amenities missing',
}

/** The notes housekeepers leave most often: one tap each, typing is the fallback. */
export const QUICK_NOTES = ['Lost and found item', 'Guest asked for extra towels', 'Stain or damage', 'Needs a deep clean'] as const

/** How long a room sits out of the queue after a DND / guest-in-room. */
export const AWAY_MS = 60 * 60e3

/** Shift clock opens at 9:41 today so the demo reads like a morning shift whenever it's run. */
export function shiftStartOffset() {
  const d = new Date()
  d.setHours(9, 41, 0, 0)
  return d.getTime() - Date.now()
}

/** Glues every "12:00 PM" in a piece of text with a no-break space, so a time never splits across two lines.
 *  Applied when text is shown too, since labels and log lines saved earlier may still have a plain space. */
export const glueTimes = (s: string) => s.replace(/(\d)\s+([AP]\.?M\b)/gi, '$1\u00a0$2')

export const fmtTime = (ms: number) => glueTimes(new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))

const room = (number: string, kind: RoomKind, bed: string, extra: Partial<Room> = {}): Room => ({
  id: number,
  number,
  floor: Number(number[0]),
  kind,
  bed,
  status: 'todo',
  elapsedMs: 0,
  awayCount: 0,
  issues: [],
  log: [],
  ...extra,
})

export function seed(): State {
  const offset = shiftStartOffset()
  const now = Date.now() + offset
  const noon = new Date(now).setHours(12, 0, 0, 0)
  return {
    role: 'housekeeper',
    offset,
    rooms: [
      room('101', 'checkout', 'King', {
        status: 'done',
        elapsedMs: 27 * 60e3,
        doneAt: now - 70 * 60e3,
        inspected: true,
        log: [
          { at: now - 97 * 60e3, text: 'Started' },
          { at: now - 70 * 60e3, text: 'Marked clean, 27 min' },
          { at: now - 50 * 60e3, text: 'Passed inspection' },
        ],
      }),
      room('102', 'stayover', 'Two queens', {
        status: 'done',
        elapsedMs: 14 * 60e3,
        doneAt: now - 45 * 60e3,
        log: [
          { at: now - 59 * 60e3, text: 'Started' },
          { at: now - 45 * 60e3, text: 'Marked clean, 14 min' },
        ],
      }),
      room('103', 'checkout', 'King'),
      room('104', 'stayover', 'Two queens', {
        request: 'Extra pillows',
        log: [{ at: now - 35 * 60e3, text: 'Front desk: guest asked for extra pillows' }],
      }),
      room('207', 'checkout', 'King', {
        rush: `Arrives ${fmtTime(noon)}`,
        log: [{ at: now - 20 * 60e3, text: `Front desk: arrives ${fmtTime(noon)}` }],
      }),
      room('209', 'stayover', 'King'),
      room('211', 'checkout', 'Suite', { vip: 'VIP, extra towels' }),
      room('305', 'stayover', 'Two queens'),
      room('308', 'checkout', 'King'),
      room('312', 'stayover', 'King'),
    ],
    // The two rooms finished before the demo opens went through Jordan like any other.
    feed: [
      { id: 'seed-102', kind: 'inspect', roomId: '102', at: now - 45 * 60e3, title: '102 is ready to inspect', detail: 'Maya marked it clean after 14 min' },
      { id: 'seed-101', kind: 'inspect', roomId: '101', at: now - 70 * 60e3, title: '101 is ready to inspect', detail: 'Maya marked it clean after 27 min', resolved: 'Passed' },
    ],
  }
}

/** Team members whose numbers are static in this demo. Maya is computed live. */
export const OTHER_HOUSEKEEPERS = [
  { name: 'Priya Patel', initials: 'PP', done: 3, total: 6, now: 'Cleaning 212' },
  { name: 'Rosa Alvarez', initials: 'RA', done: 2, total: 5, now: 'Cleaning 304' },
]
