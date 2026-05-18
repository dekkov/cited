export const GRADUATION_THRESHOLD = 21;

export const GRADUATION_MESSAGE = 'This habit may now be part of your life 🌱';   // D-09 verbatim

/**
 * Returns true if the habit is ready for graduation.
 *
 * Graduation conditions (D-09):
 * - The streak has reached 21 successful check-ins (GRADUATION_THRESHOLD)
 * - The habit is still 'active' (not already graduated or archived)
 */
export function isGraduationReady(
  currentStreakLength: number,
  userHabitStatus: 'active' | 'archived' | 'graduated',
): boolean {
  return currentStreakLength >= GRADUATION_THRESHOLD && userHabitStatus === 'active';
}
