// ActiveBharat — Canonical Data Constants
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all mock data.
// Every screen reads from here — no more inconsistent numbers.
//
// Canonical test profile:
//   Name: Viraj Sharma (VS) | Sport: Vertical Jump | BPI: 12,450
//   Level: 4 | XP: 3,450/5,000 | Streak: 12 days | Rank: #24 District
//   Sessions: 8 | Avg Form: 79% | Scout Readiness: 68%
// ─────────────────────────────────────────────────────────────────────────────

export const API_BASE = 'http://10.0.2.2:8082'; // Unused — api.js handles URL

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
