/**
 * The demo runs on a fixed clock so every page, test and screenshot agrees.
 * "Now" is Oct 7 2026, 14:00 UTC.
 */
export const NOW = Date.UTC(2026, 9, 7, 14, 0, 0);
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const STEP = 5 * MINUTE;
export const SERIES_START = NOW - 7 * DAY;

export const iso = (t: number) => new Date(t).toISOString();
export const ago = (ms: number) => iso(NOW - ms);

/** Key moments of the demo story, as epoch ms. */
export const T = {
  incident207Detected: NOW - 52 * HOUR,
  investigation031Opened: NOW - 52 * HOUR + 4 * MINUTE,
  experimentsStarted: NOW - 49 * HOUR,
  experimentsCompleted: NOW - 44 * HOUR,
  winnerPromoted: NOW - 31 * HOUR, // dep_5a21
  unrelatedDeploy: NOW - 23 * HOUR, // dep_6b02, negative control
  runtimeDeploy: NOW - 4 * HOUR, // dep_7f3c, causes INC-212
  incident212Detected: NOW - 3 * HOUR - 40 * MINUTE,
  investigation034Opened: NOW - 3 * HOUR - 38 * MINUTE,
  experiment108Started: NOW - 50 * MINUTE,
} as const;
