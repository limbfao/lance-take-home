import { seed } from './data'
import type { State } from './data'
import { clock, reducer } from './store'
import type { Action } from './store'

const min = (m: number): Action => ({ type: 'advance', ms: m * 60e3 })
/** Jordan works through inspections as the shift goes: anything finished more than an hour ago has been passed. */
function inspect(s: State) {
  const due = s.feed.filter((f) => f.kind === 'inspect' && !f.resolved && clock(s) - f.at > 60 * 60e3)
  return due.reduce((st, f) => reducer(st, { type: 'pass', feedId: f.id }), s)
}

const run = (actions: Action[], role: State['role'] = 'housekeeper') =>
  actions.reduce((s, a) => (a.type === 'advance' ? inspect(reducer(s, a)) : reducer(s, a)), { ...seed(), role })

const clean = (id: string, m: number): Action[] => [{ type: 'start', id }, min(m), { type: 'done', id }]

// Rooms are cleaned in the order the app suggests (rush first, then floor by floor), with real-world durations.
const morning = [...clean('207', 25), ...clean('211', 33), ...clean('209', 13), ...clean('103', 29), ...clean('104', 14), ...clean('308', 28), ...clean('305', 15)]

export interface Scenario {
  id: string
  label: string
  hint: string
  build: () => State
}

/** Shortcuts to the in-between moments of a shift, so each one can be shown without clicking through the day. */
export const SCENARIOS: Scenario[] = [
  { id: 'start', label: 'Start of shift', hint: 'Rush room on top', build: () => run([]) },
  {
    id: 'cleaning',
    label: 'Cleaning a room',
    hint: 'Timer running, 12 min in',
    build: () => run([{ type: 'start', id: '207' }, min(12)]),
  },
  {
    id: 'overtime',
    label: 'Running over time',
    hint: '34 of 30 min',
    build: () => run([{ type: 'start', id: '207' }, min(34)]),
  },
  {
    id: 'request',
    label: 'Guest request',
    hint: '104 needs extra pillows',
    build: () => run([...clean('207', 25), ...clean('211', 31), ...clean('209', 13), ...clean('103', 28), { type: 'start', id: '104' }, min(9)]),
  },
  {
    id: 'break',
    label: 'On a break',
    hint: '207 paused 20 min ago',
    build: () => run([{ type: 'start', id: '207' }, min(12), { type: 'pause', id: '207' }, min(20)]),
  },
  {
    id: 'paused',
    label: 'Switched rooms',
    hint: '207 paused, 209 started',
    build: () => run([{ type: 'start', id: '207' }, min(9), { type: 'start', id: '209' }, min(2)]),
  },
  {
    id: 'away',
    label: 'Door closed',
    hint: '211 waiting on DND',
    build: () => run([...clean('207', 26), min(3), { type: 'away', id: '211', reason: 'dnd' }]),
  },
  {
    id: 'retry',
    label: 'Retry is due',
    hint: '211 back after an hour',
    build: () => run([...clean('207', 26), { type: 'away', id: '211', reason: 'dnd' }, ...clean('209', 14), ...clean('103', 29), min(18)]),
  },
  {
    id: 'sentBack',
    label: 'Sent back by supervisor',
    hint: '207 failed inspection',
    build: () => {
      const s = run([...clean('207', 24), min(8)])
      const feedId = s.feed.find((f) => f.kind === 'inspect')!.id
      return reducer(s, { type: 'sendBack', feedId, reason: 'bathroom' })
    },
  },
  {
    id: 'last',
    label: 'Last room',
    hint: 'One to go',
    build: () =>
      run([...morning, { type: 'start', id: '312' }, min(6)]),
  },
  {
    id: 'end',
    label: 'End of shift',
    hint: 'Everything clean',
    build: () =>
      run([...morning, ...clean('312', 15)]),
  },
  {
    id: 'inbox',
    label: 'Supervisor inbox',
    hint: 'Inspections, a repair, a refusal',
    build: () =>
      run(
        [
          ...clean('207', 25),
          { type: 'away', id: '211', reason: 'dnd' },
          { type: 'start', id: '209' },
          min(4),
          { type: 'issue', id: '209', kind: 'ac' },
          min(9),
          { type: 'done', id: '209' },
          ...clean('103', 29),
          min(19),
          { type: 'away', id: '211', reason: 'guest' },
          { type: 'start', id: '104' },
          min(5),
        ],
        'supervisor',
      ),
  },
]
