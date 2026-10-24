import { useEffect, useState } from 'react'
import { ArrowCounterClockwise, BatteryFull, CellSignalFull, SlidersHorizontal, WifiHigh } from '@phosphor-icons/react'
import type { State } from './data'
import { clock, fmtTime, useShift } from './store'
import type { Action } from './store'
import { SCENARIOS } from './scenarios'
import { Housekeeper } from './Housekeeper'
import { Supervisor } from './Supervisor'
import { DemoConsole } from './DemoConsole'
import { Sheet } from './ui'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { glide } from './motion'

interface Toast {
  /** Each toast is a new one, so it rises in even when it replaces another. Also when it was shown. */
  id: number
  title: string
  sub?: string
  undo?: State
}

type Role = State['role']

/** A laptop wide enough for both phones: Maya and Jordan side by side, sharing one live shift. */
const SIDE_BY_SIDE = '(min-width: 1320px) and (hover: hover) and (pointer: fine)'

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

const TOAST_MS = 6000

/** `alongside` runs in the same transition, e.g. closing the sheet the action came from. */
export type Act = (action: Action, title: string, sub?: string, alongside?: () => void) => void

export default function App() {
  const [state, dispatch] = useShift()
  // Each phone has its own toast, so Maya's Undo shows on Maya's phone and Jordan's on his.
  const [toasts, setToasts] = useState<Partial<Record<Role, Toast>>>({})
  const sideBySide = useMedia(SIDE_BY_SIDE)
  const [, tick] = useState(0)
  const [demoOpen, setDemoOpen] = useState(false)
  const [scenario, setScenario] = useState<string | null>(null)
  const now = clock(state)

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // A toast leaves on its own after 6 seconds; Undo is only useful right after the tap.
  useEffect(() => {
    const timers = Object.entries(toasts).map(([role, t]) =>
      t
        ? setTimeout(
            () => setToasts((cur) => (cur[role as Role]?.id === t.id ? { ...cur, [role]: undefined } : cur)),
            Math.max(0, TOAST_MS - (Date.now() - t.id)),
          )
        : undefined,
    )
    return () => timers.forEach((t) => clearTimeout(t))
  }, [toasts])

  const show = (role: Role, t: Omit<Toast, 'id'> | null) =>
    setToasts((cur) => ({ ...cur, [role]: t ? { ...t, id: Date.now() } : undefined }))

  /** Every product action goes through here so it can be undone from the toast on the phone it came from. */
  const actFor =
    (role: Role): Act =>
    (action, title, sub, alongside) => {
      navigator.vibrate?.(15)
      alongside?.()
      show(role, { title, sub, undo: state })
      dispatch(action)
    }

  const dispatchDemo = (action: Action, note?: string) => {
    dispatch(action)
    setScenario(action.type === 'reset' ? 'start' : null)
    setToasts(note ? { [sideBySide ? 'housekeeper' : action.type === 'role' ? action.role : state.role]: { title: note, id: Date.now() } } : {})
  }

  const jump = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id)!
    dispatch({ type: 'restore', state: s.build() })
    setScenario(id)
    setToasts({})
    setDemoOpen(false)
  }

  const demoButton = (
    <button className="icon-btn demo-trigger" onClick={() => setDemoOpen(true)} aria-label="Demo controls">
      <SlidersHorizontal size={22} weight="bold" />
    </button>
  )

  const controls = (
    <DemoConsole state={state} now={now} scenario={scenario} onScenario={jump} dispatchDemo={dispatchDemo} sideBySide={sideBySide} />
  )

  const phone = (role: Role) => {
    const toast = toasts[role]
    const act = actFor(role)
    return (
      <main className="phone">
        <div className="statusbar" aria-hidden>
          <span>{fmtTime(now).replace(/\s?[AP]M/i, '')}</span>
          <span className="statusbar-icons">
            <CellSignalFull size={16} weight="fill" />
            <WifiHigh size={16} weight="bold" />
            <BatteryFull size={20} weight="fill" />
          </span>
        </div>

        {role === 'housekeeper' ? (
          <Housekeeper state={state} now={now} act={act} header={demoButton} />
        ) : (
          <Supervisor state={state} now={now} act={act} header={demoButton} />
        )}

        <AnimatePresence mode="wait">
          {toast && (
            <motion.div
              key={toast.id}
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: glide }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <div>
                <strong>{toast.title}</strong>
                {toast.sub && <span>{toast.sub}</span>}
              </div>
              {toast.undo && (
                <button
                  onClick={() => {
                    dispatch({ type: 'restore', state: toast.undo! })
                    show(role, null)
                  }}
                >
                  <ArrowCounterClockwise size={18} weight="bold" /> Undo
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {demoOpen && (
            <Sheet key="demo" title="Demo controls" onClose={() => setDemoOpen(false)}>
              {controls}
            </Sheet>
          )}
        </AnimatePresence>
      </main>
    )
  }

  return (
    // Movement follows the person's system setting: with reduced motion on, everything simply appears.
    <MotionConfig reducedMotion="user">
    <div className="stage">
      <aside className="presenter">
        <div className="presenter-head">
          <span className="wordmark">Lance</span>
          <p>
            Housekeeping shift prototype. {sideBySide ? 'The phones are' : 'The phone is'} the product, this panel is for presenting it.
          </p>
        </div>
        {controls}
      </aside>

      {sideBySide ? (
        <>
          <div className="device">
            <p className="device-label">Maya, housekeeper</p>
            {phone('housekeeper')}
          </div>
          <div className="device">
            <p className="device-label">Jordan, supervisor</p>
            {phone('supervisor')}
          </div>
        </>
      ) : (
        phone(state.role)
      )}
    </div>
    </MotionConfig>
  )
}
