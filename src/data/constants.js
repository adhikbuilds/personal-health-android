// Personal Health — Canonical Data Constants
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all mock data.
// Every screen reads from here — no more inconsistent numbers.
//
// Canonical test profile:
//   Name: Viraj Sharma (VS) | Sport: Vertical Jump | BPI: 12,450
//   Level: 4 | XP: 3,450/5,000 | Streak: 12 days | Rank: #24 District
//   Sessions: 8 | Avg Form: 79% | Scout Readiness: 68%
// ─────────────────────────────────────────────────────────────────────────────

// API_BASE is handled by src/constants.js + src/services/api.js // Unused — api.js handles URL

export const INITIAL_USER_DATA = {
  name: 'Viraj Sharma',
  tier: 'District',
  level: 4,
  xp: 3450,
  xpRequired: 5000,
  streak: 12,
  scoutReadiness: 68,
  bpi: 12450,
  sessions: 8,
  avatarId: 'athlete_01',
  stats: [
    { subject: 'Speed', A: 85, B: 70, C: 95 },
    { subject: 'Power', A: 70, B: 60, C: 85 },
    { subject: 'Agility', A: 90, B: 75, C: 95 },
    { subject: 'Coord', A: 60, B: 65, C: 80 },
    { subject: 'Stamina', A: 80, B: 55, C: 90 },
  ],
};

export const METRICS_DB = {
  physical: [
    { id: 'p1', label: 'Agility (T-Drill)', unit: 'sec', you: 12.00, avg: 13.14, betterIs: 'lower', max: 20, history: [14.2, 13.1, 12.0] },
    { id: 'p2', label: 'Vertical Jump', unit: 'cm', you: 45.0, avg: 35.0, betterIs: 'higher', max: 60, history: [32, 38, 45] },
    { id: 'p3', label: 'VO2 Max Est.', unit: 'ml/kg/min', you: 52, avg: 44, betterIs: 'higher', max: 70, history: [48, 50, 52] },
  ],
  technical: [
    { id: 't1', label: 'Form Symmetry', unit: '%', you: 82, avg: 65, betterIs: 'higher', max: 100, history: [40, 60, 82] },
    { id: 't2', label: 'Javelin Angle', unit: 'deg', you: 42, avg: 35, betterIs: 'higher', max: 45, history: [30, 38, 42] },
    // Populated from real sessions after analysis:
    { id: 't3', label: 'Avg Form Score', unit: '%', you: 79, avg: 65, betterIs: 'higher', max: 100, history: [68, 74, 79] },
  ],
  cognitive: [
    { id: 'c1', label: 'Reaction Time', unit: 'ms', you: 210, avg: 245, betterIs: 'lower', max: 500, history: [260, 240, 210] },
    { id: 'c2', label: 'Focus Score', unit: 'pts', you: 88, avg: 72, betterIs: 'higher', max: 100, history: [70, 80, 88] },
  ],
};

export const NUTRITION_PLANS = [
  {
    id: 'n1',
    title: 'Desi Power Sattu',
    desc: '50g Sattu + Jaggery + Water. Pre-workout fuel rich in plant protein.',
    macros: '24g Protein • 320 kcal',
    sport: 'Weightlifting',
    icon: '🥤',
    locked: false,
    ingredients: [
      '50g roasted chana dal sattu flour',
      '1 tbsp jaggery (or 1 tsp sugar)',
      '1 glass cold water (200–250ml)',
      'Pinch of black salt',
      '½ tsp lemon juice (optional)',
      '5–6 mint leaves (optional, for freshness)',
    ],
    steps: [
      'Add sattu flour to a tall glass.',
      'Dissolve jaggery in 2 tbsp warm water, add to glass.',
      'Pour in remaining cold water and stir briskly for 30 seconds until smooth.',
      'Add black salt, lemon juice, and mint if using.',
      'Drink 30–45 minutes before training.',
    ],
    tip: 'Best consumed fresh. Works as a complete pre-workout substitute — no supplements needed.',
  },
  {
    id: 'n2',
    title: 'Ragi Ambali',
    desc: 'Finger millet flour with cold buttermilk. High calcium, low glycemic index.',
    macros: 'High Calcium • 210 kcal',
    sport: 'Athletics',
    icon: '🥣',
    locked: false,
    ingredients: [
      '4 tbsp ragi (finger millet) flour',
      '300ml cold buttermilk (chaach)',
      '½ tsp cumin (jeera) powder',
      '¼ tsp turmeric',
      'Salt to taste',
      'Fresh coriander for garnish',
    ],
    steps: [
      'Mix ragi flour with 100ml water into a smooth paste — no lumps.',
      'Heat a pan, add the paste and cook on low flame for 4–5 minutes, stirring constantly.',
      'Remove from heat and let cool for 5 minutes.',
      'Whisk in cold buttermilk until combined.',
      'Season with cumin, turmeric, and salt.',
      'Garnish with coriander and serve chilled.',
    ],
    tip: 'Ideal for post-workout recovery. Ragi has 3× more calcium than wheat — excellent for bone health in athletes.',
  },
  {
    id: 'n3',
    title: 'Banana Peanut Recovery',
    desc: 'Ripe banana with peanut butter — fast carbs + protein for muscle repair.',
    macros: '14g Protein • 380 kcal',
    sport: 'Sprint',
    icon: '🍌',
    locked: false,
    ingredients: [
      '2 ripe bananas',
      '2 tbsp natural peanut butter (no sugar)',
      '1 glass full-fat milk (optional)',
      '½ tsp cinnamon',
    ],
    steps: [
      'Slice bananas into a bowl.',
      'Add peanut butter on top.',
      'Sprinkle cinnamon.',
      'Mash slightly or eat as-is within 30 min of training.',
      'Optionally blend with milk for a recovery shake.',
    ],
    tip: 'Bananas release glycogen fast. Eat within 30 min of intense training to maximise muscle glycogen replenishment.',
  },
  {
    id: 'n4',
    title: 'Beetroot Curd',
    desc: 'Nitrate-rich beetroot in yogurt — boosts endurance and recovers muscles.',
    macros: 'Probiotics • 150 kcal',
    sport: 'Sprint',
    icon: '🍲',
    locked: true,
    ingredients: ['Beetroot', 'Curd', 'Cumin', 'Salt'],
    steps: ['Unlock this recipe by completing 5 sprinting sessions.'],
    tip: 'Beetroot nitrates expand blood vessels — natural performance enhancer.',
  },
];

export const PLAYFIELDS = [
  { id: 1, name: 'J.N. Stadium', distance: '2.5 km', type: 'Athletics', status: 'Open', image: '🏟️', coords: { lat: 23.3441, lng: 85.3094 } },
  { id: 2, name: 'Community Ground Sec-4', distance: '0.8 km', type: 'Kabaddi', status: 'Open', image: '🌳', coords: { lat: 23.3501, lng: 85.3040 } },
  { id: 4, name: 'Govt School Mud Field', distance: '1.5 km', type: 'Wrestling', status: 'Closed', image: '🏫', coords: { lat: 23.3380, lng: 85.3200 } },
];

export const SPORTS_ACADEMY = {
  weightlifting: {
    title: 'Weightlifting', icon: '🏋️', progress: 60,
    modules: [
      { id: 'w1', title: 'Snatch: Start Posture', type: 'ai_drill', focus: 'Spine Alignment', tags: ['Posture'], locked: false },
      { id: 'w2', title: 'The First Pull', type: 'video', duration: '6:45', tags: ['Technique'], locked: false, videoId: 'PJxwIEAboJ8' },
    ],
  },
  javelin: {
    title: 'Javelin', icon: '🏹', progress: 40,
    modules: [
      { id: 'j1', title: 'Grip Varieties', type: 'video', duration: '4:20', tags: ['Basics'], locked: false, videoId: '1pE13Yt0qE4' },
      { id: 'j3', title: 'Release Physics (45°)', type: 'ai_drill', focus: 'Arm Angle', tags: ['Biomechanics'], locked: true },
    ],
  },
  cricket: {
    title: 'Cricket', icon: '🏏', progress: 80,
    modules: [
      { id: 'c2', title: 'Batting: Cover Drive', type: 'ai_drill', duration: '10 mins', tags: ['Footwork'], locked: false },
    ],
  },
};

export const SPORTS = ['vertical_jump', 'snatch', 'sprint', 'javelin', 'cricket_bat'];
export const SPORT_LABELS = {
  vertical_jump: 'Vertical Jump',
  snatch: 'Olympic Snatch',
  sprint: '20m Sprint',
  javelin: 'Javelin',
  cricket_bat: 'Cricket',
};

// ─── Full Sports Library (Learn Sports) ──────────────────────────────────────
export const SPORTS_LIBRARY = [
  { id: 'athletics',    name: 'Athletics',     emoji: '🏃', color: '#f97316', videoCount: 28, category: 'track' },
  { id: 'kabaddi',      name: 'Kabaddi',       emoji: '🤼', color: '#ef4444', videoCount: 22, category: 'combat' },
  { id: 'wrestling',    name: 'Wrestling',     emoji: '🤼‍♂️', color: '#8b5cf6', videoCount: 18, category: 'combat' },
  { id: 'kho_kho',      name: 'Kho-Kho',       emoji: '🏃‍♀️', color: '#FC4C02', videoCount: 16, category: 'team' },
  { id: 'gymnastics',   name: 'Gymnastics',    emoji: '🤸', color: '#ec4899', videoCount: 24, category: 'track' },
  { id: 'judo',         name: 'Judo',          emoji: '🥋', color: '#84cc16', videoCount: 20, category: 'combat' },
  { id: 'table_tennis', name: 'Table Tennis',  emoji: '🏓', color: '#22c55e', videoCount: 19, category: 'court' },
  { id: 'archery',      name: 'Archery',       emoji: '🏹', color: '#eab308', videoCount: 15, category: 'precision' },
  { id: 'swimming',     name: 'Swimming',      emoji: '🏊', color: '#FC4C02', videoCount: 26, category: 'aquatic' },
  { id: 'shooting',     name: 'Shooting',      emoji: '🎯', color: '#9CA3AF', videoCount: 12, category: 'precision' },
  { id: 'football',     name: 'Football',      emoji: '⚽', color: '#22c55e', videoCount: 32, category: 'team' },
  { id: 'basketball',   name: 'Basketball',    emoji: '🏀', color: '#f97316', videoCount: 27, category: 'court' },
  { id: 'badminton',    name: 'Badminton',     emoji: '🏸', color: '#FC4C02', videoCount: 34, category: 'court',
    videos: [
      { id: 'b1', title: 'How to Prepare to Return a Serve in Singles', duration: '4:12', youtubeId: 'WKb-FuwKHy8' },
      { id: 'b2', title: 'How to Hit a Backhand Flick Serve',           duration: '3:45', youtubeId: 'Bq6HXQT2YQU' },
      { id: 'b3', title: 'How to Hit a High Forehand Serve',            duration: '5:02', youtubeId: '6PBn2XK22yA' },
      { id: 'b4', title: 'How to Hit a Low Forehand Serve',             duration: '3:30', youtubeId: 'wPzrfSWPy6g' },
      { id: 'b5', title: 'How to Hit a Block Shot',                     duration: '4:55', youtubeId: 'Yz8P4YMEwJ4' },
      { id: 'b6', title: 'How to Hit a Low Backhand Serve',             duration: '3:18', youtubeId: 'OwPWYb0mvpE' },
      { id: 'b7', title: 'How to Defend a Smash',                       duration: '6:20', youtubeId: 'mhGj6BCflJE' },
      { id: 'b8', title: 'How to Hit a Backhand Overhead Clear',        duration: '5:44', youtubeId: 'ixqKJGrNLb8' },
    ],
  },
  { id: 'boxing',       name: 'Boxing',        emoji: '🥊', color: '#ef4444', videoCount: 21, category: 'combat' },
  { id: 'lawn_tennis',  name: 'Lawn Tennis',   emoji: '🎾', color: '#84cc16', videoCount: 30, category: 'court' },
  { id: 'volleyball',   name: 'Volleyball',    emoji: '🏐', color: '#eab308', videoCount: 17, category: 'team' },
  { id: 'weightlifting',name: 'Weightlifting', emoji: '🏋️', color: '#8b5cf6', videoCount: 14, category: 'track' },
  { id: 'hockey',       name: 'Hockey',        emoji: '🏑', color: '#FC4C02', videoCount: 23, category: 'team' },
];

// ─── Fitness Test Configuration ───────────────────────────────────────────────
export const FITNESS_TEST_BANDS = [
  { level: 1, label: 'Work Harder',   color: '#ef4444', minScore: 0,  maxScore: 14 },
  { level: 2, label: 'Must Improve',  color: '#f97316', minScore: 14, maxScore: 28 },
  { level: 3, label: 'Can do better', color: '#eab308', minScore: 28, maxScore: 43 },
  { level: 4, label: 'Good',          color: '#84cc16', minScore: 43, maxScore: 57 },
  { level: 5, label: 'Very Good',     color: '#22c55e', minScore: 57, maxScore: 71 },
  { level: 6, label: 'Athletic',      color: '#FC4C02', minScore: 71, maxScore: 86 },
  { level: 7, label: 'Excellent',     color: '#8b5cf6', minScore: 86, maxScore: 100 },
];

// Score BMI: 18.5–24.9 = 100pts, sliding penalty outside
export function scoreBMI(bmi) {
  if (bmi >= 18.5 && bmi <= 24.9) return 100;
  if (bmi >= 17 && bmi < 18.5) return 70;
  if (bmi > 24.9 && bmi <= 27.5) return 70;
  if (bmi >= 15 && bmi < 17) return 40;
  if (bmi > 27.5 && bmi <= 30) return 40;
  return 10;
}

// Score Sit & Reach (cm) by age — general adult norms
export function scoreSitReach(cm) {
  if (cm >= 27) return 100;
  if (cm >= 20) return Math.round(70 + ((cm - 20) / 7) * 30);
  if (cm >= 10) return Math.round(30 + ((cm - 10) / 10) * 40);
  if (cm >= 0)  return Math.round((cm / 10) * 30);
  return 10; // negative reach
}

// Score 600M Run (seconds) — lower is better; 150s=excellent, 300s=poor
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
  return {
    overall,
    level:    band.level,
    label:    band.label,
    color:    band.color,
    bmiScore,
    flexScore,
    runScore,
  };
}

// ─── Daily Tracker Defaults ──────────────────────────────────────────────────
export const DAILY_TRACKER_DEFAULTS = {
  steps:          { current: 5845,  goal: 12000, unit: 'steps',    icon: '👟', label: 'Steps' },
  activeMin:      { current: 198,   goal: 60,    unit: 'min',      icon: '⏱️', label: 'Active Min' },
  distanceKm:     { current: 3.25,  goal: 5,     unit: 'km',       icon: '📍', label: 'Distance' },
  caloriesBurned: { current: 1412,  goal: 500,   unit: 'kcal',     icon: '🔥', label: 'Calories' },
  calorieIntake:  { current: 1045,  goal: 2100,  unit: 'kcal',     icon: '🥗', label: 'Cal Intake' },
  water:          { current: 5,     goal: 12,    unit: 'glasses',  icon: '💧', label: 'Water' },
  sleep:          { current: 0,     goal: 8,     unit: 'hr',       icon: '😴', label: 'Sleep' },
};

// ─── Home Content Grid (8 tiles) ─────────────────────────────────────────────
export const HOME_CONTENT_GRID = [
  { id: 'learn_sports',  label: 'Learn Sports',    emoji: '⚽', color: '#22c55e', route: 'LearnSports' },
  { id: 'playfields',    label: 'Find Playfields',  emoji: '📍', color: '#FC4C02', route: 'Map' },
  { id: 'yoga',          label: 'Yoga Centres',     emoji: '🧘', color: '#8b5cf6', route: null },
  { id: 'nutrition',     label: 'Nutrition',        emoji: '🥗', color: '#f97316', route: 'Hub', routeParams: { section: 'nutrition' } },
  { id: 'pe_lessons',    label: 'PE Lessons',       emoji: '📚', color: '#eab308', route: 'Classes' },
  { id: 'live_sessions', label: 'Live Sessions',    emoji: '📡', color: '#ef4444', route: 'SocialFeed' },
  { id: 'quiz',          label: 'Quiz',             emoji: '🧠', color: '#ec4899', route: null },
  { id: 'assignments',   label: 'Assignments',      emoji: '📝', color: '#84cc16', route: null },
  { id: 'wellness',      label: 'Wellness',         emoji: '💚', color: '#FC4C02', route: 'Wellness' },
];

// ─── Featured Banners ─────────────────────────────────────────────────────────
export const FEATURED_BANNERS = [
  {
    id: 'f1',
    title: 'Indigenous Sports of India',
    subtitle: 'A special series on traditional sports',
    badge: 'LIVE',
    colors: ['#1d4ed8', '#2563eb'],
    route: 'LearnSports',
  },
  {
    id: 'f2',
    title: 'Fit India School Week',
    subtitle: 'Aug 4–10, 2024 · Join 10k+ schools',
    badge: 'EVENT',
    colors: ['#15803d', '#16a34a'],
    route: null,
  },
  {
    id: 'f3',
    title: 'National Sports Day Challenge',
    subtitle: 'Compete & earn exclusive badges',
    badge: 'NEW',
    colors: ['#7c3aed', '#8b5cf6'],
    route: 'SocialFeed',
  },
];

// ─── Trending Creators (mock) ─────────────────────────────────────────────────
export const TRENDING_CREATORS = [
  { id: 'c1', name: 'Fit India Icons',       handle: '@FitIndiaIcons',   initials: 'FI', color: '#f97316' },
  { id: 'c2', name: 'Fit India Champions',   handle: '@FitChampions',    initials: 'FC', color: '#22c55e' },
  { id: 'c3', name: 'Fit India Ambassadors', handle: '@FitAmbassadors',  initials: 'FA', color: '#8b5cf6' },
  { id: 'c4', name: 'Rishi Arora',           handle: '@RishiArora',      initials: 'RA', color: '#FC4C02' },
  { id: 'c5', name: 'Aditi Dixit',           handle: '@AditiDixit',      initials: 'AD', color: '#ec4899' },
];

// ─── Get Active — Exercise Categories ────────────────────────────────────────
export const GET_ACTIVE_CATEGORIES = [
  { id: 'balance',        label: 'Balance',                     emoji: '🧘', ageGroups: ['Children', 'Adult', 'Senior'], aiEnabled: false },
  { id: 'abs',            label: 'Abdominal Strength',          emoji: '💪', ageGroups: ['Adult'],                       aiEnabled: true },
  { id: 'muscular',       label: 'Muscular Endurance',          emoji: '🏋️', ageGroups: ['Adult', 'Senior'],             aiEnabled: true },
  { id: 'cardio',         label: 'Cardiovascular Endurance',    emoji: '❤️', ageGroups: ['Children', 'Adult', 'Senior'], aiEnabled: false },
  { id: 'flexibility',    label: 'Flexibility',                 emoji: '🤸', ageGroups: ['Children', 'Adult', 'Senior'], aiEnabled: true },
  { id: 'yoga',           label: 'Yoga',                        emoji: '🧘‍♀️', ageGroups: ['Children', 'Adult', 'Senior'], aiEnabled: true },
  { id: 'warmup',         label: 'Warm Up',                     emoji: '🔥', ageGroups: ['Children', 'Adult', 'Senior'], aiEnabled: false },
  { id: 'cooldown',       label: 'Cool Down',                   emoji: '❄️', ageGroups: ['Children', 'Adult', 'Senior'], aiEnabled: false },
];

// ─── PE Classes (mock data) ───────────────────────────────────────────────────
export const PE_CLASSES = [
  {
    id: 'cl1',
    title: '3 V 3 Bounce Ball',
    sport: 'Basketball',
    date: '19 May 2024',
    period: '3rd Period',
    teacherName: 'Mr. Raj Kumar',
    teacherRating: 5,
    teacherFeedback: 'Rahul puts forth the personal best effort in the activity. Is always positive.',
    studentRating: 0,
    thumbnail: '🏀',
    color: '#f97316',
  },
  {
    id: 'cl2',
    title: 'Kabaddi Fundamentals',
    sport: 'Kabaddi',
    date: '15 May 2024',
    period: '2nd Period',
    teacherName: 'Ms. Priya Singh',
    teacherRating: 4,
    teacherFeedback: 'Shows excellent teamwork and understanding of game strategy.',
    studentRating: 4,
    thumbnail: '🤼',
    color: '#ef4444',
  },
  {
    id: 'cl3',
    title: '100m Sprint Drills',
    sport: 'Athletics',
    date: '12 May 2024',
    period: '1st Period',
    teacherName: 'Mr. Arvind Mehta',
    teacherRating: 5,
    teacherFeedback: 'Consistent improvement in stride length. Keep it up!',
    studentRating: 5,
    thumbnail: '🏃',
    color: '#22c55e',
  },
];

// ─── Social Feed (mock posts) ─────────────────────────────────────────────────
export const MOCK_FEED_POSTS = [
  {
    id: 'p1',
    author: 'Rishi Arora',
    handle: '@RishiArora',
    initials: 'RA',
    avatarColor: '#FC4C02',
    sport: 'Athletics',
    content: 'Just hit a new PB in the 400m! Hard work finally paying off 💪 #FitIndia',
    likes: 142,
    comments: 18,
    timeAgo: '2h',
    isFollowing: false,
  },
  {
    id: 'p2',
    author: 'Aditi Dixit',
    handle: '@AditiDixit',
    initials: 'AD',
    avatarColor: '#ec4899',
    sport: 'Yoga',
    content: 'Morning session complete ✅ Pranayama + 45 min flow. Your body is your greatest instrument 🧘‍♀️',
    likes: 287,
    comments: 34,
    timeAgo: '4h',
    isFollowing: true,
  },
  {
    id: 'p3',
    author: 'Moh. Usman',
    handle: '@MohUsman',
    initials: 'MU',
    avatarColor: '#f97316',
    sport: 'Kabaddi',
    content: 'District championships next week! Training twice a day. Who else is competing? 🤼',
    likes: 98,
    comments: 22,
    timeAgo: '6h',
    isFollowing: false,
  },
  {
    id: 'p4',
    author: 'Fit India Icons',
    handle: '@FitIndiaIcons',
    initials: 'FI',
    avatarColor: '#22c55e',
    sport: 'National Program',
    content: '🏅 Congratulations to all athletes who completed the #FitIndiaSchoolWeek challenge! 10,000+ schools participated this year.',
    likes: 1450,
    comments: 203,
    timeAgo: '1d',
    isFollowing: true,
  },
];
