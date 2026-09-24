/**
 * Rivalry configuration for Last Chance Fantasy Pick'em.
 * Week 4 and Week 14 are rivalry weeks — same matchups repeated.
 * Confirmed from the Sleeper Week 4 schedule for league 1390903684027670528.
 */

// 6 rivalry pairs confirmed from Week 4 Sleeper matchups.
// Each season these can be updated to reflect new commissioner pairings.
export const RIVALRY_PAIRS: [number, number][] = [
  [1, 3],   // Varguitas8 vs xXExoRequiemXx
  [2, 6],   // carrizales04 vs Eltacho21
  [9, 12],  // Diegocr21 vs Curi07
  [4, 7],   // lsemilio05 vs germizzz
  [8, 11],  // JLU18 vs EmilioLozano
  [5, 10],  // DanielCasta vs saul6
];

/** Weeks where rivalry matchups occur (ida y vuelta) */
export const RIVALRY_WEEKS = [4, 14] as const;

/** Last week of the regular fantasy season */
export const SEASON_LAST_WEEK = 14;

/** First week picks were available in the app */
export const LAUNCH_WEEK = 3;

/**
 * Given a roster ID, returns their rival's roster ID, or null if not found.
 */
export function getRivalRosterId(myRosterId: number): number | null {
  for (const [a, b] of RIVALRY_PAIRS) {
    if (a === myRosterId) return b;
    if (b === myRosterId) return a;
  }
  return null;
}

/**
 * Returns true if the given week is a rivalry week.
 */
export function isRivalryWeek(week: number): boolean {
  return (RIVALRY_WEEKS as readonly number[]).includes(week);
}
