// ActiveBharat — Data Constants (Minimal)
// Only what the app actually uses. No dead exports.

// Initial state used until AuthContext + backend populate the real values.
// Every numeric field is 0 so a fresh user sees their actual zero-state
// instead of a fake "Viraj Sharma · L4 · 12-day streak" demo profile.
export const INITIAL_USER_DATA = {
  name: '',
  tier: 'Block',
  level: 1,
  xp: 0,
  xpRequired: 1000,
  streak: 0,
  scoutReadiness: 0,
  bpi: 0,
  sessions: 0,
  avatarId: '',
  sport: 'vertical_jump',
};

// Sports catalog lives in src/config/sports.js — re-exported here so the
// handful of screens that still import from data/constants keep working.
export { SPORT_KEYS as SPORTS, SPORT_LABELS } from '../config/sports';

// ─── Fitness Test (L1–L7 Fit India bands) ───────────────────────────────────

export const FITNESS_TEST_BANDS = [
  { level: 1, label: 'Work Harder',   color: '#ef4444', minScore: 0,  maxScore: 14 },
  { level: 2, label: 'Must Improve',  color: '#f97316', minScore: 14, maxScore: 28 },
  { level: 3, label: 'Can do better', color: '#eab308', minScore: 28, maxScore: 43 },
  { level: 4, label: 'Good',          color: '#84cc16', minScore: 43, maxScore: 57 },
  { level: 5, label: 'Very Good',     color: '#22c55e', minScore: 57, maxScore: 71 },
  { level: 6, label: 'Athletic',      color: '#06b6d4', minScore: 71, maxScore: 86 },
  { level: 7, label: 'Excellent',     color: '#8b5cf6', minScore: 86, maxScore: 100 },
];

export function scoreBMI(bmi) {
  if (bmi >= 18.5 && bmi <= 24.9) return 100;
  if (bmi >= 17 && bmi < 18.5) return 70;
  if (bmi > 24.9 && bmi <= 27.5) return 70;
  if (bmi >= 15 && bmi < 17) return 40;
  if (bmi > 27.5 && bmi <= 30) return 40;
  return 10;
}

export function scoreSitReach(cm) {
  if (cm >= 27) return 100;
  if (cm >= 20) return Math.round(70 + ((cm - 20) / 7) * 30);
  if (cm >= 10) return Math.round(30 + ((cm - 10) / 10) * 40);
  if (cm >= 0)  return Math.round((cm / 10) * 30);
  return 10;
}

export function score600MRun(seconds) {
  if (seconds <= 150) return 100;
  if (seconds <= 180) return Math.round(80 + ((180 - seconds) / 30) * 20);
  if (seconds <= 240) return Math.round(50 + ((240 - seconds) / 60) * 30);
  if (seconds <= 300) return Math.round(20 + ((300 - seconds) / 60) * 30);
  return 10;
}

export function computeFitnessScore(bmi, sitReach_cm, run600_seconds) {
  const bmiScore  = scoreBMI(bmi);
  const flexScore = scoreSitReach(sitReach_cm);
  const runScore  = score600MRun(run600_seconds);
  const overall   = Math.round(bmiScore * 0.25 + flexScore * 0.35 + runScore * 0.40);
  const band      = FITNESS_TEST_BANDS.find(b => overall >= b.minScore && overall < b.maxScore)
                    || FITNESS_TEST_BANDS[FITNESS_TEST_BANDS.length - 1];
  return { overall, level: band.level, label: band.label, color: band.color, bmiScore, flexScore, runScore };
}

// ─── Daily Tracker ──────────────────────────────────────────────────────────

// Daily-tracker shape with empty defaults. AsyncStorage hydrates current
// values per-day; the goal column is the user's target. Showing real zeros
// for a fresh user is honest — fake "5845 steps already today" was the
// single biggest "this app is fake" tell.
export const DAILY_TRACKER_DEFAULTS = {
  steps:          { current: 0, goal: 8000, unit: 'steps',   icon: '👟', label: 'Steps' },
  activeMin:      { current: 0, goal: 30,   unit: 'min',     icon: '⏱️', label: 'Active Min' },
  distanceKm:     { current: 0, goal: 5,    unit: 'km',      icon: '📍', label: 'Distance' },
  caloriesBurned: { current: 0, goal: 400,  unit: 'kcal',    icon: '🔥', label: 'Calories' },
  calorieIntake:  { current: 0, goal: 2000, unit: 'kcal',    icon: '🥗', label: 'Cal Intake' },
  water:          { current: 0, goal: 8,    unit: 'glasses', icon: '💧', label: 'Water' },
  sleep:          { current: 0, goal: 8,    unit: 'hr',      icon: '😴', label: 'Sleep' },
};
