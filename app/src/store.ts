import { useEffect, useReducer } from 'react'
import { AWAY_LABEL, AWAY_MS, ISSUE_LABEL, SEND_BACK_LABEL, fmtTime, seed } from './data'
import type { AwayReason, FeedItem, IssueKind, Room, SendBackReason, State } from './data'

export type Action =
  | { type: 'start'; id: string }
  | { type: 'pause'; id: string }
  | { type: 'done'; id: string }
  | { type: 'away'; id: string; reason: AwayReason }
  | { type: 'issue'; id: string; kind: IssueKind; photo?: string; note?: string }
  | { type: 'note'; id: string; text: string }
  | { type: 'ack'; feedId: string }
  | { type: 'pass'; feedId: string }
  | { type: 'sendBack'; feedId: string; reason: SendBackReason }
  | { type: 'rush'; id: string; label: string }
  | { type: 'advance'; ms: number }
  | { type: 'role'; role: State['role'] }
  | { type: 'restore'; state: State }
  | { type: 'reset' }

const KEY = 'lance-shift-v3'
const uid = () => Math.random().toString(36).slice(2, 9)

export const clock = (s: State) => Date.now() + s.offset

/** Stops the clock on a room, banking the time spent so far. */
function stopClock(r: Room, now: number): Room {
  if (r.status !== 'cleaning' || !r.startedAt) return r
  return { ...r, elapsedMs: r.elapsedMs + (now - r.startedAt), startedAt: undefined }
}

const logged = (r: Room, at: number, text: string): Room => ({ ...r, log: [...r.log, { at, text }] })

function update(state: State, id: string, fn: (r: Room) => Room): State {
  return { ...state, rooms: state.rooms.map((r) => (r.id === id ? fn(r) : r)) }
}

function post(state: State, item: Omit<FeedItem, 'id' | 'at'>): State {
  return { ...state, feed: [{ ...item, id: uid(), at: clock(state) }, ...state.feed] }
}

function resolve(state: State, feedId: string, resolved: string): State {
  return { ...state, feed: state.feed.map((f) => (f.id === feedId ? { ...f, resolved } : f)) }
}

const room = (state: State, id: string) => state.rooms.find((r) => r.id === id)!

export function reducer(state: State, action: Action): State {
  const now = clock(state)
  switch (action.type) {
    case 'start': {
      // Only one room can be on the clock: anything else in progress is paused, not lost.
      const rooms = state.rooms.map((r) => {
        if (r.id === action.id) {
          const verb = r.status === 'paused' ? 'Resumed' : 'Started'
          return logged({ ...r, status: 'cleaning' as const, startedAt: now, awayUntil: undefined }, now, verb)
        }
        if (r.status === 'cleaning') return logged({ ...stopClock(r, now), status: 'paused' as const }, now, 'Paused')
        return r
      })
      // Getting in answers any "door closed" alert still waiting on Jordan.
      const feed = state.feed.map((f) =>
        f.kind === 'away' && f.roomId === action.id && !f.resolved ? { ...f, resolved: `Maya got in at ${fmtTime(now)}` } : f,
      )
      return { ...state, rooms, feed }
    }
    case 'pause':
      // Breaks and supply runs shouldn't count as cleaning time.
      return update(state, action.id, (r) => logged({ ...stopClock(r, now), status: 'paused' }, now, 'Paused'))
    case 'done': {
      const next = update(state, action.id, (r) => {
        const stopped = stopClock(r, now)
        const again = stopped.earlierMs ? ' again' : ''
        return logged({ ...stopped, status: 'done', doneAt: now, sentBack: undefined, request: undefined }, now, `Marked clean${again}, ${minutes(stopped.elapsedMs)} min`)
      })
      const r = room(next, action.id)
      return post(next, {
        kind: 'inspect',
        roomId: r.id,
        title: `${r.number} is ready to inspect`,
        detail: r.earlierMs ? `Maya redid it in ${minutes(r.elapsedMs)} min` : `Maya marked it clean after ${minutes(r.elapsedMs)} min`,
      })
    }
    case 'away': {
      const next = update(state, action.id, (r) =>
        logged(
          {
            ...stopClock(r, now),
            status: 'away',
            awayReason: action.reason,
            awayUntil: now + AWAY_MS,
            awayCount: r.awayCount + 1,
          },
          now,
          `${AWAY_LABEL[action.reason]}, retry ${fmtTime(now + AWAY_MS)}`,
        ),
      )
      const r = room(next, action.id)
      // A second refusal is a policy question (welfare check, skip service): that's the supervisor's call.
      const repeat = r.awayCount >= 2
      const times = r.awayCount === 2 ? 'twice' : `${r.awayCount} times`
      // The new alert supersedes any earlier, unanswered one for the same room.
      const feed = next.feed.map((f) => (f.kind === 'away' && f.roomId === r.id && !f.resolved ? { ...f, resolved: 'Replaced by a newer alert' } : f))
      return post({ ...next, feed }, {
        kind: 'away',
        roomId: r.id,
        urgent: repeat,
        title: repeat ? `${r.number} turned Maya away ${times}` : `${r.number}: ${AWAY_LABEL[action.reason].toLowerCase()}`,
        detail: repeat ? 'Call the guest or approve skipping service.' : `Maya will try again at ${fmtTime(r.awayUntil!)}.`,
      })
    }
    case 'issue': {
      const next = update(state, action.id, (r) =>
        logged(
          { ...r, issues: [...r.issues, { id: uid(), kind: action.kind, at: now, photo: action.photo, note: action.note }] },
          now,
          action.kind === 'other' && action.note
            ? `Reported: ${action.note}`
            : `${ISSUE_LABEL[action.kind]} reported${action.note ? `: ${action.note}` : ''}`,
        ),
      )
      const r = room(next, action.id)
      return post(next, {
        kind: 'issue',
        roomId: r.id,
        urgent: true,
        title: action.kind === 'other' ? `Problem in ${r.number}` : `${ISSUE_LABEL[action.kind]} in ${r.number}`,
        detail: action.note ? `Maya: “${action.note}” Sent to Sam in maintenance.` : 'Reported by Maya and sent to Sam in maintenance.',
        photo: action.photo,
      })
    }
    case 'note': {
      const next = update(state, action.id, (r) => ({ ...r, log: [...r.log, { at: now, text: action.text, note: true }] }))
      const r = room(next, action.id)
      return post(next, { kind: 'note', roomId: r.id, title: `Note on ${r.number}`, detail: `Maya: “${action.text}”` })
    }
    case 'ack':
      return resolve(state, action.feedId, 'Seen')
    case 'pass': {
      const f = state.feed.find((x) => x.id === action.feedId)!
      const next = update(state, f.roomId, (r) => logged({ ...r, inspected: true }, now, 'Passed inspection'))
      return resolve(next, action.feedId, 'Passed')
    }
    case 'sendBack': {
      const f = state.feed.find((x) => x.id === action.feedId)!
      const next = update(state, f.roomId, (r) =>
        logged(
          {
            ...r,
            status: 'todo',
            sentBack: action.reason,
            doneAt: undefined,
            inspected: false,
            earlierMs: (r.earlierMs ?? 0) + r.elapsedMs,
            elapsedMs: 0,
          },
          now,
          `Sent back by Jordan: ${SEND_BACK_LABEL[action.reason].toLowerCase()}`,
        ),
      )
      return resolve(next, action.feedId, `Sent back: ${SEND_BACK_LABEL[action.reason].toLowerCase()}`)
    }
    case 'rush':
      return update(state, action.id, (r) => logged({ ...r, rush: action.label }, now, `Front desk: ${action.label.toLowerCase()}`))
    case 'advance':
      return { ...state, offset: state.offset + action.ms }
    case 'role':
      return { ...state, role: action.role }
    case 'restore':
      return action.state
    case 'reset':
      return seed()
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch {
    // Storage unavailable or corrupt: start a fresh shift.
  }
  return seed()
}

export function useShift() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      // Photos are data URLs and can blow the quota; the shift still works without them.
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])
  return [state, dispatch] as const
}

export { fmtTime }

export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const minutes = (ms: number) => Math.max(1, Math.round(ms / 60e3))

/** Everything spent on a room today, including cleans that were sent back. */
export const totalMs = (r: Room) => r.elapsedMs + (r.earlierMs ?? 0)

/** Elapsed time on a room including the live segment. */
export function elapsed(r: Room, now: number) {
  return r.elapsedMs + (r.status === 'cleaning' && r.startedAt ? now - r.startedAt : 0)
}

export const isWaiting = (r: Room, now: number) => r.status === 'away' && (r.awayUntil ?? 0) > now

/** Where the housekeeper is standing: the room on the clock, else the last room she finished. */
function currentFloor(rooms: Room[]) {
  const live = rooms.find((r) => r.status === 'cleaning')
  if (live) return live.floor
  const last = rooms.filter((r) => r.doneAt).sort((a, b) => b.doneAt! - a.doneAt!)[0]
  return last?.floor ?? 1
}

/**
 * The order a housekeeper should work in, so they never have to decide.
 * Urgent work goes first wherever it is: paused rooms, rooms sent back, rush rooms, retries that are due.
 * Everything else is grouped by floor, starting where she'll be standing and moving to the nearest floor,
 * because rooms on one floor are cleaned back to back. Within a floor, checkouts (sellable) come before stayovers.
 * Rooms where the guest turned her away wait at the bottom until their retry time.
 */
export function queue(rooms: Room[], now: number) {
  const tier = (r: Room) => {
    if (isWaiting(r, now)) return 10
    if (r.status === 'paused') return 0
    if (r.sentBack) return 1
    if (r.rush) return 2
    if (r.status === 'away') return 3
    return 4
  }
  const open = rooms.filter((r) => r.status !== 'done' && r.status !== 'cleaning')
  const byNumber = (a: Room, b: Room) => a.number.localeCompare(b.number)

  const urgent = open.filter((r) => tier(r) < 4).sort((a, b) => tier(a) - tier(b) || byNumber(a, b))
  const anchor = urgent.at(-1)?.floor ?? currentFloor(rooms)
  const dist = (r: Room) => Math.abs(r.floor - anchor)
  const kind = (r: Room) => (r.kind === 'checkout' ? 0 : 1)
  const regular = open
    .filter((r) => tier(r) === 4)
    .sort((a, b) => dist(a) - dist(b) || a.floor - b.floor || kind(a) - kind(b) || byNumber(a, b))
  const waiting = open.filter((r) => tier(r) === 10).sort((a, b) => a.awayUntil! - b.awayUntil!)

  return [...urgent, ...regular, ...waiting]
}
