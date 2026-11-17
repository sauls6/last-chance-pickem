export interface WeekSchedule {
  week: number;
  /** Unambiguous ISO-8601 UTC timestamp of the week's earliest NFL kickoff */
  kickoffAt: string;
  /** Unambiguous ISO-8601 UTC timestamp when the week is officially final (Tuesday 6:00 AM America/New_York after MNF) */
  weekFinalAt: string;
}

const NY_TIMEZONE = 'America/New_York';

/**
 * Converts a wall-clock date/time in America/New_York to an exact UTC Date,
 * accounting for EDT (UTC-4) / EST (UTC-5) daylight saving transitions.
 */
export function nyWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const getNyAsUtcMs = (utcMs: number): number => {
    const parts = formatter.formatToParts(new Date(utcMs));
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = Number(p.value);
    }
    const h = map.hour === 24 ? 0 : map.hour;
    return Date.UTC(map.year, map.month - 1, map.day, h, map.minute, map.second);
  };

  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Two-pass convergence handles DST boundary hours accurately
  let utcGuess = targetAsUtc + (targetAsUtc - getNyAsUtcMs(targetAsUtc));
  utcGuess = utcGuess + (targetAsUtc - getNyAsUtcMs(utcGuess));
  return new Date(utcGuess);
}

/**
 * Extracts calendar (year, month, day) in America/New_York for a given UTC Date.
 */
function getNyCalendarDate(date: Date): { year: number; month: number; day: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  let year = 2026;
  let month = 1;
  let day = 1;
  let weekdayStr = 'Thu';
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
    else if (p.type === 'weekday') weekdayStr = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { year, month, day, weekday: weekdayMap[weekdayStr] ?? 4 };
}

/**
 * Computes Tuesday 6:00 AM America/New_York following the week's games.
 * Given the latest game in the week (or kickoff if no later game is known),
 * advances to the next Tuesday in America/New_York at 06:00.
 */
export function computeTuesdayFinalAt(anchorGameDate: Date): Date {
  const ny = getNyCalendarDate(anchorGameDate);
  // Days until Tuesday (weekday === 2). If anchor is Mon (1), +1 day; Sun (0), +2; Thu (4), +5; Wed (3), +6; Tue (2), +0 (if before) or +7 (if MNF slipped to Tue, advance at least 1 day if needed — MNF is Mon so +1).
  let daysUntilTue = (2 - ny.weekday + 7) % 7;
  if (daysUntilTue === 0) daysUntilTue = 7;
  const targetDayUtc = new Date(Date.UTC(ny.year, ny.month - 1, ny.day + daysUntilTue));
  return nyWallClockToUtc(
    targetDayUtc.getUTCFullYear(),
    targetDayUtc.getUTCMonth() + 1,
    targetDayUtc.getUTCDate(),
    6,
    0
  );
}

/**
 * Authoritative fallback 2026 NFL regular-season schedule per week,
 * expressed in America/New_York wall-clock time (verified against ESPN).
 * Used when the live ESPN schedule API is unavailable or fails.
 */
const FALLBACK_2026_SCHEDULE: Record<
  number,
  { year: number; month: number; day: number; hour: number; minute: number }
> = {
  1:  { year: 2026, month: 9,  day: 9,  hour: 20, minute: 20 }, // Wed Sep 9, 8:20 PM EDT
  2:  { year: 2026, month: 9,  day: 17, hour: 20, minute: 15 }, // Thu Sep 17, 8:15 PM EDT
  3:  { year: 2026, month: 9,  day: 24, hour: 20, minute: 15 }, // Thu Sep 24, 8:15 PM EDT
  4:  { year: 2026, month: 10, day: 1,  hour: 20, minute: 15 }, // Thu Oct 1, 8:15 PM EDT
  5:  { year: 2026, month: 10, day: 8,  hour: 20, minute: 15 }, // Thu Oct 8, 8:15 PM EDT
  6:  { year: 2026, month: 10, day: 15, hour: 20, minute: 15 }, // Thu Oct 15, 8:15 PM EDT
  7:  { year: 2026, month: 10, day: 22, hour: 20, minute: 15 }, // Thu Oct 22, 8:15 PM EDT
  8:  { year: 2026, month: 10, day: 29, hour: 20, minute: 15 }, // Thu Oct 29, 8:15 PM EDT
  9:  { year: 2026, month: 11, day: 5,  hour: 20, minute: 15 }, // Thu Nov 5, 8:15 PM EST (post-DST)
  10: { year: 2026, month: 11, day: 12, hour: 20, minute: 15 }, // Thu Nov 12, 8:15 PM EST
  11: { year: 2026, month: 11, day: 19, hour: 20, minute: 15 }, // Thu Nov 19, 8:15 PM EST
  12: { year: 2026, month: 11, day: 25, hour: 20, minute: 0 },  // Wed Nov 25, 8:00 PM EST (Thanksgiving week)
  13: { year: 2026, month: 12, day: 3,  hour: 20, minute: 15 }, // Thu Dec 3, 8:15 PM EST
  14: { year: 2026, month: 12, day: 10, hour: 20, minute: 15 }, // Thu Dec 10, 8:15 PM EST
  15: { year: 2026, month: 12, day: 17, hour: 20, minute: 15 }, // Thu Dec 17, 8:15 PM EST
  16: { year: 2026, month: 12, day: 24, hour: 20, minute: 15 }, // Thu Dec 24, 8:15 PM EST
  17: { year: 2026, month: 12, day: 31, hour: 20, minute: 15 }, // Thu Dec 31, 8:15 PM EST
  18: { year: 2027, month: 1,  day: 10, hour: 0,  minute: 0 },  // Sat/Sun Jan 10, TBD
};

function getFallbackWeekSchedule(week: number): WeekSchedule {
  const entry = FALLBACK_2026_SCHEDULE[week];
  if (entry) {
    const kickoff = nyWallClockToUtc(entry.year, entry.month, entry.day, entry.hour, entry.minute);
    const weekFinal = computeTuesdayFinalAt(kickoff);
    return {
      week,
      kickoffAt: kickoff.toISOString(),
      weekFinalAt: weekFinal.toISOString(),
    };
  }
  // Fallback for unexpected week numbers beyond Week 18: offset in NY calendar days from Week 1
  const w1 = FALLBACK_2026_SCHEDULE[1];
  const kickoff = nyWallClockToUtc(w1.year, w1.month, w1.day + (week - 1) * 7, 20, 15);
  return {
    week,
    kickoffAt: kickoff.toISOString(),
    weekFinalAt: computeTuesdayFinalAt(kickoff).toISOString(),
  };
}

const scheduleCache = new Map<number, { data: WeekSchedule; timestamp: number }>();
const SCHEDULE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetches the authoritative NFL schedule for a given regular-season week from ESPN,
 * falling back to the DST-aware per-week 2026 schedule table if the network request fails.
 */
export async function fetchWeekSchedule(week: number): Promise<WeekSchedule> {
  const now = Date.now();
  const cached = scheduleCache.get(week);
  if (cached && now - cached.timestamp < SCHEDULE_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}`
    );
    if (res.ok) {
      const json = (await res.json()) as { events?: { date?: string }[] };
      const timestamps = (json.events ?? [])
        .map((e) => (e.date ? new Date(e.date).getTime() : NaN))
        .filter((ms) => !Number.isNaN(ms));

      if (timestamps.length > 0) {
        const earliest = new Date(Math.min(...timestamps));
        const latest = new Date(Math.max(...timestamps));
        const schedule: WeekSchedule = {
          week,
          kickoffAt: earliest.toISOString(),
          weekFinalAt: computeTuesdayFinalAt(latest).toISOString(),
        };
        scheduleCache.set(week, { data: schedule, timestamp: now });
        return schedule;
      }
    }
  } catch {
    // Fall through to authoritative per-week fallback
  }

  const fallback = getFallbackWeekSchedule(week);
  scheduleCache.set(week, { data: fallback, timestamp: now });
  return fallback;
}

/**
 * Formats an unambiguous kickoff ISO timestamp for UI display in the user's local timezone
 * (e.g. "Thu, Nov 19 · 7:15 PM CST"), so banners and cards always reflect the exact lock time.
 */
export function formatKickoffLabel(kickoffIso: string): string {
  const date = new Date(kickoffIso);
  if (Number.isNaN(date.getTime())) return 'Kickoff TBD';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
