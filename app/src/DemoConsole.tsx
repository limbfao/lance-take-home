import { ArrowsClockwise, Lightning } from '@phosphor-icons/react'
import type { State } from './data'
import { fmtTime } from './store'
import type { Action } from './store'
import { SCENARIOS } from './scenarios'

/** Presenter controls: not part of the product, so it lives outside the phone on desktop. */
export function DemoConsole({
  state,
  now,
  scenario,
  onScenario,
  dispatchDemo,
  sideBySide,
}: {
  state: State
  now: number
  scenario: string | null
  onScenario: (id: string) => void
  dispatchDemo: (a: Action, note?: string) => void
  /** Both phones are on screen, so there's no one to switch to. */
  sideBySide?: boolean
}) {
  const rushable = state.rooms.filter((r) => r.status !== 'done' && !r.rush).slice(0, 2)
  // An early arrival is always about an hour out from the shift clock, on the half hour.
  const arrival = `Arrives ${fmtTime(Math.ceil((now + 60 * 60e3) / (30 * 60e3)) * 30 * 60e3)}`

  return (
    <div className="console">
      {!sideBySide && (
        <div className="console-block">
          <h5>Viewing as</h5>
          <div className="segmented" role="tablist">
            {(['housekeeper', 'supervisor'] as const).map((role) => (
              <button
                key={role}
                role="tab"
                aria-selected={state.role === role}
                onClick={() => dispatchDemo({ type: 'role', role })}
              >
                {role === 'housekeeper' ? 'Maya, housekeeper' : 'Jordan, supervisor'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="console-block">
        <h5>Shift clock</h5>
        <div className="clock-row">
          <span className="clock">{fmtTime(now)}</span>
          {[5, 15, 60].map((m) => (
            <button key={m} className="console-btn" onClick={() => dispatchDemo({ type: 'advance', ms: m * 60e3 }, `Skipped ahead ${m < 60 ? `${m} min` : '1 hour'}`)}>
              +{m < 60 ? `${m}m` : '1h'}
            </button>
          ))}
        </div>
      </div>

      <div className="console-block">
        <h5>Jump to a moment</h5>
        <ul className="scenarios">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <button aria-current={scenario === s.id} onClick={() => onScenario(s.id)}>
                <strong>{s.label}</strong>
                <span>{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="console-block">
        <h5>Front desk</h5>
        <div className="console-row">
          {rushable.map((r) => (
            <button
              key={r.id}
              className="console-btn"
              onClick={() => dispatchDemo({ type: 'rush', id: r.id, label: arrival }, `Front desk flagged ${r.number}`)}
            >
              <Lightning size={14} weight="fill" /> Early arrival in {r.number}
            </button>
          ))}
        </div>
      </div>

      <button className="console-btn console-reset" onClick={() => dispatchDemo({ type: 'reset' }, 'Demo reset')}>
        <ArrowsClockwise size={14} weight="bold" /> Reset demo
      </button>
    </div>
  )
}
