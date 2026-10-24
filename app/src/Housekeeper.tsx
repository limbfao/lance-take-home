import { useRef, useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, CaretRight, Check, CheckCircle, Flag, NotePencil, Pause, Play, Plus, SealCheck, Wrench } from '@phosphor-icons/react'
import { AWAY_LABEL, ISSUE_LABEL, KIND_LABEL, PLANNED_MIN, QUICK_NOTES, glueTimes } from './data'
import type { AwayReason, IssueKind, Room, State } from './data'
import { elapsed, fmtClock, fmtTime, isWaiting, minutes, queue, totalMs } from './store'
import type { Act } from './App'
import { fade, row } from './motion'
import { AWAY_ICON, Avatar, Backdrop, ISSUE_ICON, NOTE_ICON, Plate, RoomBadges, Sheet, ShiftStrip, reminders } from './ui'

const describe = (r: Room) => `${KIND_LABEL[r.kind].guest}, ${r.bed.toLowerCase()}`

export function Housekeeper({ state, now, act, header }: { state: State; now: number; act: Act; header: React.ReactNode }) {
  // One sheet at a time, by construction: opening a sheet replaces whatever is open.
  const [sheet, setSheet] = useState<{ kind: 'flag' | 'detail' | 'note'; id: string } | null>(null)
  const open = (kind: 'flag' | 'detail' | 'note', id: string) => setSheet({ kind, id })
  const [showDone, setShowDone] = useState(false)

  const rooms = state.rooms
  const current = rooms.find((r) => r.status === 'cleaning')
  const todo = queue(rooms, now)
  const done = rooms.filter((r) => r.status === 'done').sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  const hero = current ?? todo[0]
  const rest = current ? todo : todo.slice(1)
  const byId = (id: string | null) => rooms.find((r) => r.id === id)

  const closeSheets = () => {
    setSheet(null)
  }
  const start = (r: Room) => {
    const verb = r.status === 'paused' ? 'Resumed' : 'Started'
    const sub = current && current.id !== r.id ? `${current.number} is paused at the top of your list.` : undefined
    act({ type: 'start', id: r.id }, `${verb} ${r.number}`, sub, closeSheets)
  }
  const pause = (r: Room) =>
    act({ type: 'pause', id: r.id }, `Paused ${r.number}`, 'The timer has stopped. Resume when you’re back.', closeSheets)
  const finish = (r: Room) => {
    const left = rooms.length - done.length - 1
    act({ type: 'done', id: r.id }, `${r.number} marked clean`, left ? `${left} to go. Jordan will inspect it.` : 'That was your last room.', closeSheets)
  }

  // The list as one flat run of rows, with a quiet floor marker wherever the walk changes floors.
  const items: ReactNode[] = []
  rest.forEach((r, i) => {
    const prevFloor = i === 0 ? (current ?? hero)?.floor : rest[i - 1].floor
    if (i === 0 || r.floor !== prevFloor)
      items.push(
        <motion.li key={`floor-${r.id}`} className="floor-divider" aria-hidden={i === 0 && r.floor === prevFloor} {...row}>
          Floor {r.floor}
        </motion.li>,
      )
    items.push(<RoomRow key={r.id} room={r} now={now} onStart={() => start(r)} onOpen={() => open('detail', r.id)} />)
  })

  const flagRoom = sheet?.kind === 'flag' ? byId(sheet.id) : undefined
  const detailRoom = sheet?.kind === 'detail' ? byId(sheet.id) : undefined
  const noteRoom = sheet?.kind === 'note' ? byId(sheet.id) : undefined

  return (
    <div className="screen">
      <header className="top">
        <Avatar initials="MC" tone="maya" />
        <div className="top-title">
          <h2>My rooms</h2>
          <p>
            <strong>{done.length}</strong> of {rooms.length} clean
          </p>
        </div>
        {header}
      </header>
      <div className="top-strip">
        <ShiftStrip rooms={rooms} now={now} />
      </div>

      <motion.div className="scroll" layoutScroll>
        {hero ? (
          <HeroCard
            room={hero}
            now={now}
            onStart={() => start(hero)}
            onDone={() => finish(hero)}
            onPause={() => pause(hero)}
            onFlag={() => open('flag', hero.id)}
            onOpen={() => open('detail', hero.id)}
          />
        ) : (
          <AllDone rooms={rooms} />
        )}

        {rest.length > 0 && (
          <section>
            <h4 className="group-label">{current ? 'Up next' : 'Then'}</h4>
            <ul className="group">
              <AnimatePresence initial={false} mode="popLayout">
                {items}
              </AnimatePresence>
            </ul>
          </section>
        )}

        {done.length > 0 && hero && (
          <section>
            <button className="group-label toggle" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
              Clean today ({done.length})
              <CaretRight size={16} weight="bold" className={showDone ? 'rot' : ''} />
            </button>
            <AnimatePresence initial={false}>
              {showDone && (
                <motion.ul key="done" className="group" {...fade}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {done.map((r) => (
                      <DoneRow key={r.id} room={r} now={now} onOpen={() => open('detail', r.id)} />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
        )}
      </motion.div>

      {/* One backdrop for all of Maya's sheets, so it stays dimmed while one sheet replaces another. */}
      <AnimatePresence>{sheet && <Backdrop key="backdrop" onClose={closeSheets} />}</AnimatePresence>
      {/* "wait": a sheet replacing another slides away before the next slides in, so two never overlap. */}
      <AnimatePresence mode="wait">

      {flagRoom && (
        <FlagSheet
          key={`flag-${flagRoom.id}`}
          room={flagRoom}
          onClose={closeSheets}
          onAway={(reason) =>
            act(
              { type: 'away', id: flagRoom.id, reason },
              `${flagRoom.number} moved to later`,
              `It comes back on your list in an hour. Jordan has been told.`,
              closeSheets,
            )
          }
          onIssue={(kind, photo, note) =>
            act(
              { type: 'issue', id: flagRoom.id, kind, photo, note },
              kind === 'other' ? `Problem reported in ${flagRoom.number}` : `${ISSUE_LABEL[kind]} reported in ${flagRoom.number}`,
              'Sent to maintenance. Keep going.',
              closeSheets,
            )
          }
        />
      )}

      {detailRoom && (
        <RoomSheet
          key={`detail-${detailRoom.id}`}
          room={detailRoom}
          now={now}
          onClose={closeSheets}
          onStart={() => start(detailRoom)}
          onDone={() => finish(detailRoom)}
          onPause={() => pause(detailRoom)}
          onFlag={() => open('flag', detailRoom.id)}
          onNote={() => open('note', detailRoom.id)}
        />
      )}

      {noteRoom && (
        <NoteSheet
          key={`note-${noteRoom.id}`}
          room={noteRoom}
          onClose={closeSheets}
          onSend={(text) => act({ type: 'note', id: noteRoom.id, text }, `Note added to ${noteRoom.number}`, 'Jordan can see it.', closeSheets)}
        />
      )}
      </AnimatePresence>
    </div>
  )
}

function startVerb(r: Room) {
  if (r.status === 'paused') return 'Resume'
  if (r.status === 'away') return 'Try again'
  return 'Start'
}

function HeroCard({
  room,
  now,
  onStart,
  onDone,
  onPause,
  onFlag,
  onOpen,
}: {
  room: Room
  now: number
  onStart: () => void
  onDone: () => void
  onPause: () => void
  onFlag: () => void
  onOpen: () => void
}) {
  const live = room.status === 'cleaning'
  const ms = elapsed(room, now)
  const planned = PLANNED_MIN[room.kind] * 60e3
  const over = ms > planned
  const toCheck = live ? reminders(room) : []

  return (
    // A new room, or the same room in a new state, fades in as a fresh card. Anything else (the timer
    // ticking, a list opening below) leaves it exactly as it is.
    <motion.article key={`${room.id}-${room.status}`} className={`hero ${live ? 'hero-live' : ''}`} {...fade}>
      <div className="hero-top">
        <span className="hero-state">
          {live ? (
            <>
              <i className="live-dot" /> Cleaning now
            </>
          ) : room.status === 'paused' ? (
            <>
              <Pause size={16} weight="fill" /> Paused
            </>
          ) : isWaiting(room, now) ? (
            // Only closed doors are left: this one is next once the guest is ready.
            'Waiting on the guest'
          ) : (
            'Your next room'
          )}
        </span>
        {live && (
          <span className={`timer ${over ? 'over' : ''}`}>
            {fmtClock(ms)}
            <small>{over ? `${minutes(ms - planned)} min over` : `of ${PLANNED_MIN[room.kind]} min`}</small>
          </span>
        )}
      </div>

      <button className="hero-room" onClick={onOpen} aria-label={`Room ${room.number} details`}>
        <Plate room={room} size="xl" />
        <span className="hero-what">
          <strong>{KIND_LABEL[room.kind].title}</strong>
          <span>{describe(room)}</span>
        </span>
        <CaretRight size={20} weight="bold" className="hero-caret" />
      </button>

      <RoomBadges room={room} now={now} limit={2} hidePaused hideReminders={live} />

      {toCheck.length > 0 && (
        <div className="finish">
          <span className="finish-head">Before you finish</span>
          <ul>
            {toCheck.map(({ key, icon: I, text }) => (
              <li key={key}>
                <I size={18} weight="fill" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {live && (
        <div className="meter" aria-hidden>
          <i style={{ width: `${Math.min(100, (ms / planned) * 100)}%` }} />
        </div>
      )}

      <div className="hero-actions">
        {live ? (
          <button className="btn btn-done" onClick={onDone}>
            <CheckCircle size={28} weight="fill" /> Mark {room.number} clean
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onStart}>
            <Play size={22} weight="fill" /> {startVerb(room)} {room.number}
          </button>
        )}
        {live ? (
          <div className="btn-pair">
            <button className="btn btn-quiet" onClick={onPause}>
              <Pause size={20} weight="fill" /> Pause
            </button>
            <button className="btn btn-quiet" onClick={onFlag}>
              <Flag size={20} weight="bold" /> Problem
            </button>
          </div>
        ) : (
          <button className="btn btn-quiet" onClick={onFlag}>
            <Flag size={20} weight="bold" /> {room.status === 'paused' ? 'Report a problem' : 'Can’t get in?'}
          </button>
        )}
      </div>
    </motion.article>
  )
}

/** Problems are reported from the top card or the room sheet: you only meet a closed door on the room you're walking to. */
function RoomRow({ room, now, onStart, onOpen, ref }: { room: Room; now: number; onStart: () => void; onOpen: () => void; ref?: Ref<HTMLLIElement> }) {
  const waiting = isWaiting(room, now)
  return (
    <motion.li ref={ref} className={`row ${waiting ? 'row-waiting' : ''}`} {...row}>
      <button className="row-main" onClick={onOpen} aria-label={`Room ${room.number} details`}>
        <Plate room={room} tone={room.rush || room.sentBack ? 'plate-rush' : waiting ? 'plate-away' : ''} />
        <span className="row-body">
          <strong>{KIND_LABEL[room.kind].title}</strong>
          <span>{describe(room)}</span>
          <RoomBadges room={room} now={now} limit={1} hidePaused />
        </span>
      </button>
      <button className={`row-go ${waiting ? 'row-go-quiet' : ''}`} onClick={onStart}>
        {startVerb(room)}
      </button>
    </motion.li>
  )
}

function DoneRow({ room, now, onOpen, ref }: { room: Room; now: number; onOpen: () => void; ref?: Ref<HTMLLIElement> }) {
  return (
    <motion.li ref={ref} className="row row-done" {...row}>
      <button className="row-main" onClick={onOpen} aria-label={`Room ${room.number} details`}>
        <Plate room={room} tone="plate-done" />
        <span className="row-body">
          <strong>{KIND_LABEL[room.kind].title}</strong>
          <span>
            Clean at {fmtTime(room.doneAt!)}, {minutes(totalMs(room))} min
          </span>
          <RoomBadges room={room} now={now} limit={1} />
        </span>
      </button>
      <span className="done-mark" aria-label="Clean">
        <Check size={20} weight="bold" />
      </span>
    </motion.li>
  )
}

function AllDone({ rooms }: { rooms: Room[] }) {
  const avg = Math.round(rooms.reduce((s, r) => s + totalMs(r), 0) / rooms.length / 60e3)
  const inspected = rooms.filter((r) => r.inspected).length
  return (
    <article className="all-done">
      <span className="all-done-mark">
        <SealCheck size={40} weight="fill" />
      </span>
      <h3>All {rooms.length} rooms are clean</h3>
      <p>Jordan can see you’re free for another assignment.</p>
      <dl>
        <div>
          <dt>Average room</dt>
          <dd>{avg} min</dd>
        </div>
        <div>
          <dt>Inspected</dt>
          <dd>
            {inspected} of {rooms.length}
          </dd>
        </div>
      </dl>
    </article>
  )
}

function FlagSheet({
  room,
  onClose,
  onAway,
  onIssue,
}: {
  room: Room
  onClose: () => void
  onAway: (r: AwayReason) => void
  onIssue: (k: IssueKind, photo?: string, note?: string) => void
}) {
  const [step, setStep] = useState<'menu' | 'broken' | 'details'>('menu')
  const [kind, setKind] = useState<IssueKind>('other')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string>()
  const file = useRef<HTMLInputElement>(null)

  const pickPhoto = (f?: File) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(f)
  }

  // One last screen before it goes: a note and a photo, both optional. Only "Something else" needs one of the
  // two, since its icon says nothing; the others can be sent as they are.
  if (step === 'details') {
    const typed = note.trim()
    const other = kind === 'other'
    const I = ISSUE_ICON[kind]
    return (
      <Sheet
        ownBackdrop={false}
        title={other ? `What’s wrong in ${room.number}?` : `${ISSUE_LABEL[kind]} in ${room.number}`}
        onClose={onClose}
        onBack={() => setStep('broken')}
        step={`details-${kind}`}
      >
        {!other && (
          <p className="issue-picked">
            <I size={22} weight="duotone" /> Add a note or photo if it helps, or just send it.
          </p>
        )}
        <textarea
          className="note-input"
          rows={3}
          placeholder={other ? "What's wrong? For example: window won't close" : 'Note (optional)'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus={other}
        />
        <button className={`photo-btn ${photo ? 'has' : ''}`} onClick={() => file.current?.click()}>
          {photo ? <img src={photo} alt="" /> : <Camera size={26} weight="bold" />}
          <span>{photo ? 'Photo added. Tap to retake.' : 'Add a photo (optional)'}</span>
        </button>
        <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        <button className="btn btn-primary" disabled={other && !typed && !photo} onClick={() => onIssue(kind, photo, typed || undefined)}>
          Send to maintenance
        </button>
      </Sheet>
    )
  }

  if (step === 'broken') {
    return (
      <Sheet ownBackdrop={false} title={`What’s broken in ${room.number}?`} onClose={onClose} onBack={() => setStep('menu')} step="broken">
        <p className="sheet-hint">Pick what’s broken. You can add a note or photo next.</p>
        <div className="issue-grid">
          {(Object.keys(ISSUE_ICON) as IssueKind[]).map((k) => {
            const I = ISSUE_ICON[k]
            return (
              <button
                key={k}
                className="issue-tile"
                onClick={() => {
                  setKind(k)
                  setStep('details')
                }}
              >
                <I size={30} weight="duotone" />
                {ISSUE_LABEL[k]}
              </button>
            )
          })}
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet ownBackdrop={false} title={`Room ${room.number}`} onClose={onClose} step="menu">
      <div className="options">
        {(['dnd', 'guest'] as AwayReason[]).map((reason) => {
          const I = AWAY_ICON[reason]
          return (
            <button key={reason} className="option" onClick={() => onAway(reason)}>
              <span className="option-icon tone-away">
                <I size={26} weight="fill" />
              </span>
              <span className="option-text">
                {AWAY_LABEL[reason]}
                <small>Skip it for now. It comes back in an hour.</small>
              </span>
            </button>
          )
        })}
        <button className="option" onClick={() => setStep('broken')}>
          <span className="option-icon tone-issue">
            <Wrench size={26} weight="fill" />
          </span>
          <span className="option-text">
            Something is broken
            <small>Send it to maintenance and keep cleaning.</small>
          </span>
          <CaretRight size={22} weight="bold" className="option-caret" />
        </button>
      </div>
    </Sheet>
  )
}

function RoomSheet({
  room,
  now,
  onClose,
  onStart,
  onDone,
  onPause,
  onFlag,
  onNote,
}: {
  room: Room
  now: number
  onClose: () => void
  onStart: () => void
  onDone: () => void
  onPause: () => void
  onFlag: () => void
  onNote: () => void
}) {
  const photos = room.issues.filter((i) => i.photo)
  return (
    <Sheet
      ownBackdrop={false}
      title={
        <span className="sheet-title-room">
          <Plate room={room} size="sm" /> {KIND_LABEL[room.kind].title}
        </span>
      }
      onClose={onClose}
    >
      <dl className="facts">
        <div>
          <dt>Guest</dt>
          <dd>{KIND_LABEL[room.kind].guest}</dd>
        </div>
        <div>
          <dt>Bed</dt>
          <dd>{room.bed}</dd>
        </div>
        <div>
          <dt>Planned</dt>
          <dd>{PLANNED_MIN[room.kind]} min</dd>
        </div>
      </dl>
      <RoomBadges room={room} now={now} />
      {photos.length > 0 && (
        <div className="photos">
          {photos.map((i) => (
            <img key={i.id} src={i.photo} alt={`${ISSUE_LABEL[i.kind]} photo`} />
          ))}
        </div>
      )}
      <section>
        <div className="group-head">
          <h4 className="group-label">Today</h4>
          <button className="text-btn" onClick={onNote}>
            <Plus size={16} weight="bold" /> Add a note
          </button>
        </div>
        {room.log.length ? (
          <ol className="log">
            {[...room.log].reverse().map((l, i) => (
              <li key={i} className={l.note ? 'log-note' : ''}>
                <time>{fmtTime(l.at)}</time>
                {l.note ? (
                  <span>
                    <NotePencil size={16} weight="fill" /> {l.text}
                  </span>
                ) : (
                  glueTimes(l.text)
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">Nothing yet. Start the room to begin the log.</p>
        )}
      </section>
      {room.status !== 'done' && (
        <div className="sheet-actions">
          {room.status === 'cleaning' ? (
            <button className="btn btn-done-solid" onClick={onDone}>
              <CheckCircle size={26} weight="fill" /> Mark {room.number} clean
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onStart}>
              <Play size={22} weight="fill" /> {startVerb(room)} {room.number}
            </button>
          )}
          {room.status === 'cleaning' ? (
            <div className="btn-pair">
              <button className="btn btn-quiet" onClick={onPause}>
                <Pause size={20} weight="fill" /> Pause
              </button>
              <button className="btn btn-quiet" onClick={onFlag}>
                <Flag size={20} weight="bold" /> Problem
              </button>
            </div>
          ) : (
            <button className="btn btn-quiet" onClick={onFlag}>
              <Flag size={20} weight="bold" /> Report a problem
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

function NoteSheet({ room, onClose, onSend }: { room: Room; onClose: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const typed = text.trim()
  return (
    <Sheet ownBackdrop={false} title={`Note for ${room.number}`} onClose={onClose}>
      <p className="sheet-hint">Tap one to send it to Jordan, or write your own.</p>
      <div className="options">
        {QUICK_NOTES.map((n) => {
          const I = NOTE_ICON[n]
          return (
            <button key={n} className="option option-compact" onClick={() => onSend(n)}>
              <span className="option-icon tone-neutral">
                <I size={22} weight="duotone" />
              </span>
              <span className="option-text">{n}</span>
              <CaretRight size={20} weight="bold" className="option-caret" />
            </button>
          )
        })}
      </div>
      <textarea
        className="note-input"
        rows={3}
        placeholder="Write a note"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn btn-primary" disabled={!typed} onClick={() => onSend(typed)}>
        Send note
      </button>
    </Sheet>
  )
}
