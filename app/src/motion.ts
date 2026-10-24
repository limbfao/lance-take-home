import type { Transition } from 'motion/react'

/*
  Motion animates the real elements (rows, the top card's room number, sheets, the toast), so they stack,
  clip and overlap exactly as they do at rest, in every browser. One feel throughout: quick, no bounce,
  settled in about a quarter of a second, so it never slows a tap down.
*/

const curve = [0.2, 0.8, 0.2, 1] as const

/** Rows sliding to their new place, a room number flying between the list and the top card. */
export const glide: Transition = { type: 'tween', ease: curve, duration: 0.26 }

/** Things appearing and disappearing in place. */
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: { duration: 0.18 },
}

/** A row entering or leaving the list: it fades while its neighbours glide into the space. */
export const row = {
  ...fade,
  layout: true,
  transition: { ...glide, opacity: { duration: 0.18 } },
} as const
