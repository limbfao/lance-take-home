import { useState } from 'react'
import { ArrowUUpLeft, CaretRight, Door, NotePencil, SealCheck, Warning, Wrench } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { OTHER_HOUSEKEEPERS, SEND_BACK_LABEL, glueTimes } from './data'
import type { FeedItem, SendBackReason, State } from './data'
import { elapsed, fmtClock, fmtTime, isWaiting, minutes } from './store'
import type { Act } from './App'
import { AWAY_ICON, Avatar, Sheet, ShiftStrip } from './ui'
import { AnimatePresence, motion } from 'motion/react'
import { fade, row } from './motion'

const FEED_LOOK: Record<FeedItem['kind'], { icon: Icon; tone: string }> = {
  inspect: { icon: SealCheck, tone: 'tone-done' },
  issue: { icon: Wrench, tone: 'tone-issue' },
  away: { icon: Door, tone: 'tone-away' },
  note: { icon: NotePencil, tone: 'tone-note' },
  info: { icon: Warning, tone: 'tone-away' },
}

function ago(at: number, now: number) {
  const m = Math.floor((now - at) / 60e3)
  return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : fmtTime(at)
}

export function Supervisor({ state, now, act, header }: { state: State; now: number; act: Act; header: React.ReactNode }) {
  const [sendBackFor, setSendBackFor] = useState<FeedItem | null>(null)
  const [showHandled, setShowHandled] = useState(false)

  const open = state.feed.filter((f) => !f.resolved)
  // Urgent first, then oldest first: whoever has waited longest gets answered next.
  open.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || a.at - b.at)
  const handled = state.feed.filter((f) => f.resolved)
  const rooms = state.rooms
  const done = rooms.filter((r) => r.status === 'done').length
  const current = rooms.find((r) => r.status === 'cleaning')
  const paused = rooms.find((r) => r.status === 'paused')
  const waiting = rooms.filter((r) => isWaiting(r, now))

  const number = (f: FeedItem) => rooms.find((r) => r.id === f.roomId)!.number
  // Only an empty room can be sold; a stayover is simply ready for the guest who's staying.
  const passNote = (f: FeedItem) =>
    rooms.find((r) => r.id === f.roomId)!.kind === 'checkout' ? 'The front desk can sell it now.' : 'Ready for the guest.'

  return (
    <div className="screen">
      <header className="top">
        <Avatar initials="JB" tone="jordan" />
        <div className="top-title">
          <h2>Housekeeping</h2>
          <p>{open.length ? `${open.length} waiting on you` : 'Nothing waiting on you'}</p>
        </div>
        {header}
      </header>

      <motion.div className="scroll" layoutScroll>
        <section>
          <h4 className="group-label">Waiting on you</h4>
          {open.length === 0 ? (
            <p className="empty-card">When a housekeeper finishes a room, can’t get in, or finds something broken, it lands here.</p>
          ) : (
            <ul className="group">
              <AnimatePresence initial={false} mode="popLayout">
              {open.map((f) => {
                const look = FEED_LOOK[f.kind]
                const reason = f.kind === 'away' ? rooms.find((r) => r.id === f.roomId)?.awayReason : undefined
                const I = f.urgent && f.kind === 'away' ? Warning : reason ? AWAY_ICON[reason] : look.icon
                return (
                  <motion.li key={f.id} className={`feed ${f.kind === 'inspect' ? '' : 'feed-inline'}`} {...row}>
                    <span className={`option-icon ${f.urgent && f.kind === 'away' ? 'tone-rush' : look.tone}`}>
                      <I size={22} weight="fill" />
                    </span>
                    <div className="feed-body">
                      <strong>{f.title}</strong>
                      <span>{glueTimes(f.detail)}</span>
                      <small>{ago(f.at, now)}</small>
                      {f.photo && <img className="feed-photo" src={f.photo} alt="Reported problem" />}
                      <div className="feed-actions">
                        {f.kind === 'inspect' ? (
                          <>
                            <button className="chip-btn" onClick={() => setSendBackFor(f)}>
                              <ArrowUUpLeft size={18} weight="bold" /> Send back
                            </button>
                            <button
                              className="chip-btn chip-btn-go"
                              onClick={() => act({ type: 'pass', feedId: f.id }, `${number(f)} passed inspection`, passNote(f))}
                            >
                              <SealCheck size={18} weight="fill" /> Pass
                            </button>
                          </>
                        ) : (
                          <button className="chip-btn" onClick={() => act({ type: 'ack', feedId: f.id }, 'Marked as seen')}>
                            Got it
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.li>
                )
              })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section>
          <h4 className="group-label">Team</h4>
          <ul className="group">
            <li className="team">
              <Avatar initials="MC" tone="maya" />
              <div className="team-body">
                <div className="team-line">
                  <strong>Maya Chen</strong>
                  <span>
                    {done} of {rooms.length}
                  </span>
                </div>
                <ShiftStrip rooms={rooms} now={now} />
                <small>
                  {current
                    ? `Cleaning ${current.number} for ${fmtClock(elapsed(current, now))}`
                    : paused
                      ? `Paused ${paused.number} after ${minutes(paused.elapsedMs)} min`
                      : 'Between rooms'}
                  {waiting.length > 0 && `. Door closed: ${waiting.map((r) => r.number).join(', ')}`}
                </small>
              </div>
            </li>
            {OTHER_HOUSEKEEPERS.map((h) => (
              <li key={h.name} className="team">
                <Avatar initials={h.initials} tone="other" />
                <div className="team-body">
                  <div className="team-line">
                    <strong>{h.name}</strong>
                    <span>
                      {h.done} of {h.total}
                    </span>
                  </div>
                  <div className="strip" aria-hidden>
                    {Array.from({ length: h.total }, (_, i) => (
                      <i key={i} className={`seg ${i < h.done ? 'seg-done' : i === h.done ? 'seg-cleaning' : 'seg-todo'}`} />
                    ))}
                  </div>
                  <small>{h.now}</small>
                </div>
              </li>
            ))}
          </ul>
          <div className="legend">
            <span>
              <i className="seg seg-done" /> Clean
            </span>
            <span>
              <i className="seg seg-cleaning" /> Cleaning
            </span>
            <span>
              <i className="seg seg-paused" /> Paused
            </span>
            <span>
              <i className="seg seg-away" /> Door closed
            </span>
            <span>
              <i className="seg seg-todo" /> To do
            </span>
          </div>
        </section>

        {handled.length > 0 && (
          <section>
            <button className="group-label toggle" onClick={() => setShowHandled(!showHandled)} aria-expanded={showHandled}>
              Handled ({handled.length})
              <CaretRight size={16} weight="bold" className={showHandled ? 'rot' : ''} />
            </button>
            <AnimatePresence initial={false}>
            {showHandled && (
              <motion.ul key="handled" className="group" {...fade}>
                <AnimatePresence initial={false} mode="popLayout">
                {handled.map((f) => (
                  <motion.li key={f.id} className="feed feed-handled" {...row}>
                    <div className="feed-body">
                      <strong>{f.title}</strong>
                      <span>{f.resolved}</span>
                      <small>{ago(f.at, now)}</small>
                    </div>
                  </motion.li>
                ))}
                </AnimatePresence>
              </motion.ul>
            )}
            </AnimatePresence>
          </section>
        )}
      </motion.div>

      <AnimatePresence>
      {sendBackFor && (
        <Sheet key="send-back" title={`What needs redoing in ${number(sendBackFor)}?`} onClose={() => setSendBackFor(null)}>
          <p className="sheet-hint">It goes back to the top of Maya’s list with your reason.</p>
          <div className="options">
            {(Object.keys(SEND_BACK_LABEL) as SendBackReason[]).map((reason) => (
              <button
                key={reason}
                className="option option-compact"
                onClick={() =>
                  act({ type: 'sendBack', feedId: sendBackFor.id, reason }, `${number(sendBackFor)} sent back to Maya`, SEND_BACK_LABEL[reason], () =>
                    setSendBackFor(null),
                  )
                }
              >
                <span className="option-text">{SEND_BACK_LABEL[reason]}</span>
                <CaretRight size={20} weight="bold" className="option-caret" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
      </AnimatePresence>
    </div>
  )
}
