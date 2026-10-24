# Lance Shift: One tap per room

A mobile-first MVP for hotel housekeepers. The list tells you which room to do next, every room moves from **Start** to **Done** in two taps without leaving the list, and "can't get in" or "something's broken" takes two taps and goes straight to the supervisor.

- Write-up and UX critique: [`docs/WRITEUP.md`](docs/WRITEUP.md)
- Demo video, Maya and Jordan side by side: [`lance-demo-side-by-side.mp4`](../lance-demo-side-by-side.mp4)

## Run it
```bash
npm install
npm run dev      # open on your phone, or a ~390px-wide browser
npm run build    # static build in dist/
```

On a laptop the app shows Maya's and Jordan's phones side by side, sharing one live shift, so a tap on one visibly lands on the other; a presenter panel sits next to them. On a narrower screen it shows one phone, with a switch between the two. On a phone, the same controls open from the sliders button in the header. The panel lets you:
- switch between **Maya (housekeeper)** and **Jordan (supervisor)** when only one phone fits
- move the **shift clock** forward (+5m / +15m / +1h) to show timers running over and DND retries coming due
- **jump to a moment**: start of shift, cleaning, running over time, guest request, on a break, switched rooms, door closed, retry due, sent back, last room, end of shift, supervisor inbox
- fire **front desk** events (an early arrival makes a room jump the queue)

## Try this flow
1. **Start 207** (rush: guest arrives at 12:00) → **Mark 207 clean** → *Undo* is available for 6 s
2. On 211 (now the top card, same floor as 207): **Can’t get in? → Do not disturb**. It drops to the bottom and comes back in 1 hr
3. **Start 209** → **Report a problem → Something is broken → AC or heat** → optional note and photo → **Send to maintenance**
4. Switch to **Jordan**: the AC report, the DND, and "207 is ready to inspect" are in *Waiting on you*. **Pass** it, or **Send back** with a reason, and it returns to the top of Maya's list
5. While cleaning, tap **Pause**: the clock stops, and the room waits on top with **Resume**
6. Jump to **Guest request**: while 104 is being cleaned, the live card shows *Before you finish: Guest asked: extra pillows*. **Mark 104 clean** is still one tap
7. Tap any room number to open its sheet with details and today's activity log. **Add a note** sends a one-tap common note (lost and found, extra towels, stain, deep clean) or a typed one to Jordan's inbox

## Notes
- Data is hardcoded (`src/data.ts`) and saved to `localStorage`, so a refresh keeps your shift. Use **Reset demo** to start over.
- State logic lives in one reducer (`src/store.ts`). The queue order is in `queue()`: urgent work first (paused → sent back → rush → retry due), then the rest grouped by floor, starting from where she's standing, with checkouts before stayovers on each floor. Rooms waiting on a DND or guest go last.
- Demo moments are built by replaying real actions through that reducer (`src/scenarios.ts`), so each one is a true product state rather than a mock.
- React + TypeScript + Vite, with Motion for animation. Icons from [Phosphor](https://phosphoricons.com). Type is Archivo, with its condensed width used for room numbers so they read like door plates.
- Colour: everything neutral is a step of warm beige, from linen cards to sand for rooms still to do, with espresso type. The five statuses are deep, earthy hues (ink navy cleaning, sage clean, brick rush, plum door closed, ochre maintenance), and each is always paired with an icon or a word.
- Motion: animations use [Motion](https://motion.dev) on the real elements (`src/motion.ts`). Rows glide to their new places, a new top card fades in, sheets slide up over a backdrop that stays put when one sheet replaces another, and the toast rises, all in about 250ms. Because nothing is a snapshot, elements stack and clip exactly as they do at rest, in every browser. Reduced-motion settings are respected.
