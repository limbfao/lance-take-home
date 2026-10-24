# Lance Shift: One tap per room

**Contents**

1. [UX critique of the current app](#part-1-ux-critique-of-the-current-app)
2. [What I built](#part-2-what-i-built): user and problem, the core fix, the new feature, what supports them, [patterns borrowed from other products](#patterns-borrowed-from-other-products-and-what-i-left-behind)
3. [In vs. out](#in-vs-out-of-the-mvp), [metric](#primary-success-metric), [risks](#risks-and-edge-cases), [next steps](#what-id-build-next)

---

## Part 1: UX critique of the current app

I looked at the walkthrough: [sign-on](../../original-screenshots/3-not-used/), housekeeper *[My work](../../original-screenshots/1-referenced/04-housekeeper-my-work.png)*, [room detail](../../original-screenshots/1-referenced/05-room-detail-start-clean.png), supervisor *[Housekeeping](../../original-screenshots/1-referenced/09-supervisor-housekeeping-crew.png)* and *[Move rooms](../../original-screenshots/1-referenced/10-supervisor-move-rooms-unassigned.png)*, the [maintenance work order](../../original-screenshots/1-referenced/13-maintenance-work-order-305-ac.png), and the *[Property* board](../../original-screenshots/1-referenced/15-property-board.png). All 15 screenshots are in `[original-screenshots/](../../original-screenshots/README.md)`. Here is what breaks down in real shift use.

### 1. Changing a room's status means going into a detail screen, twice per room

- **What's broken:** On *[My work](../../original-screenshots/1-referenced/04-housekeeper-my-work.png)*, the cards can't be acted on directly. To start a room you tap the card, land on a detail screen, and tap **[Start clean](../../original-screenshots/1-referenced/05-room-detail-start-clean.png)**. To finish it you have to find the room again, open it again, and tap **[Complete clean](../../original-screenshots/1-referenced/06-room-detail-in-progress.png)**. The live timer only shows up inside that detail screen.
- **Who:** Housekeepers, on every room, all shift.
- **Why it matters:** That's about 4–6 taps and 4 screen changes per room, when two taps would do. At 15+ rooms a day it adds up. Worse, when updating is slow, people batch it ("I'll mark them all at break"), so the board the front desk sells rooms from is always behind.

### 2. The room detail screen is a wall of data the housekeeper doesn't need

- **What's broken:** [Seven rows of metadata](../../original-screenshots/1-referenced/05-room-detail-start-clean.png) come before the action: Priority *Standard*, **Cleaned by: Maya Chen** (shown to Maya), Planned, Clean type (already in the title), Room type, Room status, Checkout *"No checkout · 2026-10-22"*. Codes like `QNQN`, `Clean Vacant dirty` and `VD/OD/VC/VR/OOO` need a legend even on the [supervisor board](../../original-screenshots/1-referenced/15-property-board.png).
- **Who:** Housekeepers with little training or English as a second language, and new hires.
- **Why it matters:** Each screen asks the user to read and decode. Under stress people skim, miss the one detail that matters (VIP, early arrival), and lose confidence in the app.

### 3. The list doesn't tell you what to do next, or why

- **What's broken:** The four cards on *[My work](../../original-screenshots/1-referenced/04-housekeeper-my-work.png)* look identical. The only ordering is "dirty ones first". There's no sign of an early arrival, a rush, a VIP, or a room that turned the housekeeper away earlier. The filter chips (*All / Assigned to you / Checkout 0 / Refresh 4*) and search add noise to a list of about 7 rooms. Cards are tall, so only four fit on screen.
- **Who:** Housekeepers, plus the front desk waiting on a specific room.
- **Why it matters:** The housekeeper decides the order from memory or a radio call, and a guest who arrives at noon can end up waiting while a stayover gets tidied first.

### 4. No fast path for the most common exceptions: DND, guest in room, something broken

- **What's broken:** Nothing on the list or the detail screen handles "I can't get in". The only ways to report a problem are a free-text **[Note](../../original-screenshots/1-referenced/05-room-detail-start-clean.png)** marked *"Shared with the desktop board"* (nobody is notified) and a separate **Add a photo**, with anything else hidden behind **More actions**.
- **Who:** Housekeepers (several times a shift), supervisors, and maintenance.
- **Why it matters:** DND rooms quietly drop off the plan and are found at 3 pm. Broken ACs get mentioned in the hallway or typed into a note nobody reads, so the next guest checks into a hot room. This is the gap behind the *[305 AC not cooling](../../original-screenshots/1-referenced/13-maintenance-work-order-305-ac.png)* work order in the demo.

### 5. Supervisors have to go looking for problems; the app doesn't bring problems to them

- **What's broken:** The supervisor's *[Housekeeping](../../original-screenshots/1-referenced/09-supervisor-housekeeping-crew.png)* screen shows progress bars, but nothing about rooms waiting for inspection, DND rooms, or the 2 unassigned rooms, which sit behind an unlabeled **+** that opens a screen called *[Move rooms](../../original-screenshots/1-referenced/10-supervisor-move-rooms-unassigned.png)*. **Complete clean** goes [straight to *Vacant clean* with no undo](../../original-screenshots/1-referenced/07-room-completed-toast.png), so one mis-tap marks a dirty room clean.
- **Who:** Supervisors and the front desk.
- **Why it matters:** Supervisors poll the app or the radio instead of acting. A mis-tapped "clean" can lead to a dirty room being sold.

---

## Part 2: What I built

### User and problem

**Maya**, a housekeeper with 10 rooms today (2 already done), a phone in her apron, and a cart in the hall. She'll touch the app 50+ times this shift, usually with her hands full.

**The problem:** updating a room's status takes about 5 taps and 4 screens ([critique #1](#1-changing-a-rooms-status-means-going-into-a-detail-screen-twice-per-room)), so she updates late or in batches, and the board the front desk sells rooms from is wrong. When something goes wrong at a door or in a room (critique #4), there's no quick way to say so, and nobody is told.

### Core problem fixed: status in two taps

*Addresses critique #1, with #2 and #3 folded in.*

- **The home screen is the work.** A large card shows the next room and one button: **Start 207**.
- **Tap it and the card turns cobalt:** *Cleaning now*, a live timer against the planned time ("14:20 of 30 min"), and a large **Mark 207 clean**. That's **2 taps per room, with no navigation.**
- **The list is ordered for her,** so she never has to decide:
  1. Urgent work first: paused rooms, rooms sent back, rush rooms from the front desk, and door retries that are due.
  2. Then floor by floor, starting where she's standing and moving to the nearest floor, with checkouts (sellable) before stayovers. A quiet marker shows where the floor changes.
  3. Rooms that turned her away wait at the bottom until their retry time.
- **Plain language instead of codes:** *Full clean, Checked out, king*, not `Clean Vacant dirty · KING`. Only details that change what she does appear as badges (*Arrives 12:00 PM*, *VIP, extra towels*), and a list row shows at most one.
- **Undo instead of "Are you sure?"** Every action shows a toast with **Undo** for 6 seconds. It's faster than a confirmation and still catches mis-taps.

### New feature: "Can't get in" and "something's broken" in two taps

*Addresses critique #4, and the inbox half of #5.*

**For Maya.** The top card has **Can't get in?** (you only meet a closed door on the room you're walking to), and every room's sheet has **Report a problem**. Both open three large choices:


| Choice                                         | What happens                                                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Do not disturb** or **Guest is in the room** | One tap. The room drops to the bottom with "retry 11:40 AM" and comes back by itself an hour later. Jordan is notified. A second refusal is marked urgent, because skipping service or a welfare check is the supervisor's call. |
| **Something is broken**                        | A grid of 6 icons (AC, leak, toilet, power, TV/Wi-Fi, something else), then one short screen with an optional note and an optional photo, and **Send to maintenance**. It puts a badge on the room. Only *Something else* needs a few words or a photo, because without them maintenance would have to come and ask. Maya keeps cleaning.                                                  |


**For Jordan, the supervisor.** A report only helps if someone acts on it, so everything lands in a **Waiting on you** inbox, urgent items first:

- Flags arrive live, each with a one-tap **Got it**. When Maya gets into a room that turned her away, its alert closes by itself.
- Finished rooms arrive as inspections with **Pass** or **Send back** and a one-tap reason. A sent-back room goes to the top of Maya's list with that reason and gets a fresh timer for the redo.
- A **Team** section shows Maya's shift as a live strip, one segment per room, with what she's doing now ("Cleaning 104 for 5:00", "Paused 207 after 9 min").

### What supports the core loop

Small pieces that keep the two-tap loop honest, not separate features:

- **Pause.** For a break, a supply run, or being called away. The clock stops, so break time never counts as cleaning time, and Jordan sees "Paused 207" instead of a room that looks 50 minutes overdue. Starting another room pauses the current one automatically.
- **"Before you finish," only when the room needs it.** There's no confirmation or checklist on Mark clean: at 15+ rooms a day, "Did you restock everything?" becomes a reflex tap. The routine standard lives in training and on the cart. While she cleans, the live card lists only what's specific to this room: a guest request (*extra pillows*), a VIP setup (*extra towels*), or why Jordan sent it back (*Recheck: bathroom*). No checkboxes, so Mark clean stays one tap, and most rooms show nothing.
- **Notes that someone reads.** The [original note field](../../original-screenshots/1-referenced/05-room-detail-start-clean.png) was "shared with the desktop board" and alerted no one. **Add a note** offers four one-tap common notes (lost and found, extra towels, stain or damage, needs a deep clean) plus free text. Each note goes to the room's log and to Jordan's inbox.
- **Room sheet.** Tap a room number for its details, every badge, and today's activity log (started, paused, refused, reported, marked clean, inspected).

### Patterns borrowed from other products, and what I left behind

Housekeeping isn't the only job where someone works fast, under pressure, with a phone as a side tool. I looked at how other products handle the same moments and took the part that fits a housekeeper, not the whole pattern.

| Product | What it does well | What I took | What I left, and why |
|---|---|---|---|
| **Restaurant kitchen displays** (Toast, Square) | A cook "bumps" a finished ticket with one tap, and can recall it if they bumped the wrong one. | **Mark clean** is the bump: one tap, with Undo as the recall. | Nothing. It's the closest match to a housekeeper's shift: high volume, hands busy, mistakes cheap to fix. |
| **Uber driver app** | One big button per trip state (arrived, start trip, end trip). The driver never hunts for the next action. | The live card has one main button that changes with the room's state: Start, then Mark clean. | **Swipe to confirm.** It stops accidental taps, but it's slower and unreliable with wet gloves. Undo catches mistakes without taxing every correct tap. |
| **Gmail Undo Send** and Material Design's snackbar guidance | For actions that can be reversed, show an undo afterwards instead of an "are you sure?" before. | The toast with Undo for 6 seconds, and no confirmation dialogs anywhere. | Gmail's delay before sending. Status changes are applied immediately, because Jordan and the front desk need them live. |
| **Google Maps navigation** | The next turn is huge; the rest of the route is a smaller list underneath. | "Your next room" is the next turn. The list below is the route, grouped by floor in walking order. | Rerouting on its own every time something changes. The list only reorders for real reasons (an early arrival, a retry coming due), so it doesn't jump around under her thumb. |
| **Strava** | Moving time is kept separate from elapsed time, so stopping at a light doesn't ruin your pace. | **Pause**, so a break or supply run never counts as cleaning time. | Auto-detection. It would need sensors or guesswork. A manual Pause is honest and fine for an MVP. |
| **Linear's inbox** | Shows only what needs you. Once you act on something, it leaves. | Jordan's **Waiting on you**: inspections, repairs and refusals, each with its action inline. Handled items drop into a collapsed **Handled** list. | Snoozing and filters. Jordan's inbox is short enough that filters would just be another thing to learn. |
| **Delivery apps** (DoorDash, Instacart) | When a delivery goes wrong, the driver picks a preset reason and can add a photo, so support doesn't have to ask follow-up questions. | **Can't get in?** and **Something is broken** as icon tiles, with an optional note and photo on the next screen. | Required photo proof. For a broken TV, proof isn't needed and adds time. |
| **Warehouse productivity tracking** (Amazon's widely criticized "Time Off Task" metric) | A cautionary example: a timer used to rank and police people. | The lesson. Overtime is measured against the plan for the room type, Pause and redos keep the numbers fair, and there's no leaderboard. | Comparing people. The timer exists so Jordan can plan arrivals and help, not to rank the team. |

**Demo controls** (not part of the product): switch between Maya and Jordan, move the shift clock forward, and jump to any in-between moment (cleaning, running over, guest request, on a break, switched rooms, door closed, retry due, sent back, last room, end of shift, supervisor inbox). Each moment is built by replaying real actions, so it's a true product state.

---

### In vs. out of the MVP


| In                                                    | Out (on purpose)                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Room list ordered for her, by urgency and floor       | Sign-on / PIN (exists today, works)                                                                                      |
| 2-tap Start → Mark clean, live timer, Pause           | Real backend, PMS sync, multiple devices                                                                                 |
| Undo instead of confirmation dialogs                  | Room assignment and *[Move rooms](../../original-screenshots/2-context/11-supervisor-assign-to-priya.png)* (critique #5) |
| DND / guest in room, with automatic retry             | Inspection checklists and photos                                                                                         |
| Broken-item reporting with icons and a photo          | Maintenance's own work-order app                                                                                         |
| Supervisor inbox: Pass / Send back, Got it, team view | Languages, offline queue, push notifications                                                                             |
| "Before you finish" for room-specific needs           | Per-room checklists, new hire mode                                                                                       |
| Notes routed to the supervisor                        | Analytics                                                                                                                |
| Mobile-first, saved on the device, resettable demo    | Tablet layout for supervisors (the app stays a phone-width column on tablets)                                            |


**Assumptions in the data:** rooms, guests and times are hardcoded. Planned times are 30 min for a full clean, which matches the original app's *[Planned* row](../../original-screenshots/1-referenced/05-room-detail-start-clean.png), and 15 min for a stayover, which is my placeholder; in practice these come from each property's standards.

### Primary success metric

**Median taps per room status cycle** (start → clean).


|                                                                                                                                                                                                                                                                                                                                                   | Taps  | Screen changes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------- |
| Current app ([list](../../original-screenshots/1-referenced/04-housekeeper-my-work.png) → [detail](../../original-screenshots/1-referenced/05-room-detail-start-clean.png) → [in progress](../../original-screenshots/1-referenced/06-room-detail-in-progress.png) → [done](../../original-screenshots/1-referenced/07-room-completed-toast.png)) | ~5    | 4              |
| This MVP                                                                                                                                                                                                                                                                                                                                          | **2** | **0**          |


- **Outcome it should move:** time from finishing a room to the board showing it clean. If updating is effortless, rooms reach the board as they're finished instead of in batches, and the front desk can sell them sooner.
- **Guardrail:** undo rate on **Mark clean**. A high rate means the button is too easy to hit by mistake.

### Risks and edge cases

1. **A wrong "clean" slips through.** Undo only lasts 6 seconds; if she pockets the phone right away, the mistake reaches the board. *Mitigation:* supervisor inspection before a room is sold, and a longer undo from *Clean today*.
2. **The suggested order can be wrong on the floor.** It knows floors, but not where her cart actually is. Nothing is locked, so she can start any room. If she often picks a different room, the order needs real position data.
3. **Repeated refusals.** A DND still up after an hour comes back as "Try the door again", and the second refusal escalates to Jordan. What happens after that (skip service, welfare check) is property policy, not an app decision.
4. **Connectivity and shared devices.** Stairwells and basements are dead zones, so actions need an offline queue. A shared phone means each person has to sign on.

### What I'd build next

1. **Inspection detail:** a short room-type checklist and a photo on Send back, so the reason is specific.
2. **New hire mode:** Jordan turns on a short room-type checklist for a new housekeeper's first weeks, or it switches on by itself when someone's send-back rate climbs. The extra step falls on the people who need it instead of on everyone, and send-back reasons already give us the data to target it.
3. **Offline-first action queue,** so taps never fail in the stairwell.
4. **Language and icon pass,** Spanish first. Most of the UI is already numbers, icons and verbs.
5. **Close the maintenance loop:** when maintenance [finishes "305 AC"](../../original-screenshots/2-context/14-maintenance-request-done.png), housekeeping and the front desk are told automatically.
6. **Real data from the PMS:** rushes, guest requests and VIP flags pulled in automatically, and ordering that knows where her cart is.

