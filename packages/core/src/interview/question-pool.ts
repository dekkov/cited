import type { Domain } from './schemas';

export type QuestionChoice = {
  id: string;
  label: string;
};

export type PoolQuestion = {
  id: string;
  domain: Domain | 'general';
  text: string;
  choices: QuestionChoice[];
};

export const QUESTION_POOL: readonly PoolQuestion[] = [
  // ── Sleep ──────────────────────────────────────────────────────────────
  {
    id: 'sleep-quality',
    domain: 'sleep',
    text: 'How would you describe your sleep most nights?',
    choices: [
      { id: 'restful', label: 'Restful — I wake up refreshed' },
      { id: 'okay', label: "Okay, but I'd like more" },
      { id: 'restless', label: 'Restless or interrupted' },
      { id: 'hard-to-sleep', label: 'I struggle to fall or stay asleep' },
    ],
  },
  {
    id: 'sleep-bedtime-consistency',
    domain: 'sleep',
    text: 'How consistent is your bedtime?',
    choices: [
      { id: 'same-every-night', label: 'Same time every night, including weekends' },
      { id: 'within-hour', label: 'Within an hour on weekdays' },
      { id: 'varies', label: 'Varies a lot' },
      { id: 'no-track', label: "I don't really track it" },
    ],
  },
  {
    id: 'sleep-screens-before-bed',
    domain: 'sleep',
    text: "What's your screen time in the hour before bed?",
    choices: [
      { id: 'none', label: 'None — I read or wind down' },
      { id: 'a-little', label: 'A little — quick check' },
      { id: 'most', label: 'Most of that hour' },
      { id: 'phone-in-bed', label: 'I usually fall asleep with my phone' },
    ],
  },
  {
    id: 'sleep-hours',
    domain: 'sleep',
    text: 'How many hours of sleep do you typically get?',
    choices: [
      { id: '8plus', label: '8+ hours' },
      { id: '7to8', label: '7–8 hours' },
      { id: '6to7', label: '6–7 hours' },
      { id: 'under6', label: 'Under 6 hours' },
    ],
  },
  {
    id: 'sleep-wakeup-feeling',
    domain: 'sleep',
    text: 'When you wake up, how do you feel?',
    choices: [
      { id: 'alert', label: 'Alert and ready' },
      { id: 'groggy-but-fine', label: 'A bit groggy, fine after coffee' },
      { id: 'tired', label: 'Tired, need time to start' },
      { id: 'exhausted', label: 'Exhausted, hitting snooze' },
    ],
  },
  {
    id: 'sleep-caffeine-timing',
    domain: 'sleep',
    text: "When's your last caffeine of the day?",
    choices: [
      { id: 'none', label: "I don't drink caffeine" },
      { id: 'morning', label: 'Morning only' },
      { id: 'early-afternoon', label: 'Early afternoon' },
      { id: 'late', label: 'Late afternoon or evening' },
    ],
  },

  // ── Nutrition / gut ────────────────────────────────────────────────────
  {
    id: 'nutrition-vegetables',
    domain: 'nutrition_gut',
    text: 'How many servings of vegetables do you eat on a typical day?',
    choices: [
      { id: '5plus', label: '5+ servings, varied' },
      { id: '2to4', label: '2–4 servings' },
      { id: 'one', label: '1 or so' },
      { id: 'rarely', label: 'Rarely' },
    ],
  },
  {
    id: 'nutrition-protein',
    domain: 'nutrition_gut',
    text: 'How would you describe your protein intake?',
    choices: [
      { id: 'plenty', label: 'Plenty, every meal' },
      { id: 'decent', label: 'Decent at most meals' },
      { id: 'light', label: 'Light, mostly carbs' },
      { id: 'no-think', label: "I don't really think about it" },
    ],
  },
  {
    id: 'nutrition-water',
    domain: 'nutrition_gut',
    text: 'How much water do you drink in a day?',
    choices: [
      { id: '2plus', label: '2L+ steadily through the day' },
      { id: '1to2', label: '1–2L' },
      { id: 'under-1', label: 'Less than 1L' },
      { id: 'other-drinks', label: 'I mostly drink other things' },
    ],
  },
  {
    id: 'nutrition-ultraprocessed',
    domain: 'nutrition_gut',
    text: 'How much of your food is ultra-processed (packaged, fast food, snacks)?',
    choices: [
      { id: 'very-little', label: 'Very little, mostly whole foods' },
      { id: 'some', label: 'Some, alongside whole-food meals' },
      { id: 'half', label: 'About half' },
      { id: 'most', label: 'Most of what I eat' },
    ],
  },
  {
    id: 'nutrition-meal-timing',
    domain: 'nutrition_gut',
    text: 'How regular are your meal times?',
    choices: [
      { id: 'same', label: 'Same times every day' },
      { id: 'roughly', label: 'Roughly the same' },
      { id: 'erratic', label: 'All over the place' },
      { id: 'skip-graze', label: 'I often skip meals or graze' },
    ],
  },
  {
    id: 'nutrition-gut-symptoms',
    domain: 'nutrition_gut',
    text: 'Do you notice digestion issues (bloating, sluggishness, discomfort)?',
    choices: [
      { id: 'rare', label: 'Rarely or never' },
      { id: 'occasional', label: 'Occasionally after certain foods' },
      { id: 'weekly', label: 'Several times a week' },
      { id: 'daily', label: 'Most days' },
    ],
  },

  // ── Exercise / longevity ───────────────────────────────────────────────
  {
    id: 'exercise-frequency',
    domain: 'exercise_longevity',
    text: 'How many days a week do you move intentionally (walk, gym, sport)?',
    choices: [
      { id: '5plus', label: '5+ days' },
      { id: '3to4', label: '3–4 days' },
      { id: '1to2', label: '1–2 days' },
      { id: 'rarely', label: 'Rarely' },
    ],
  },
  {
    id: 'exercise-strength',
    domain: 'exercise_longevity',
    text: 'Do you do any strength training?',
    choices: [
      { id: 'twice-week', label: '2+ sessions per week' },
      { id: 'occasional', label: 'Occasionally' },
      { id: 'want-to-start', label: "I'd like to start" },
      { id: 'no', label: 'Not really for me' },
    ],
  },
  {
    id: 'exercise-cardio',
    domain: 'exercise_longevity',
    text: 'How often do you get your heart rate up (brisk walk, run, bike, HIIT)?',
    choices: [
      { id: 'most-days', label: 'Most days' },
      { id: 'few-week', label: 'A few times a week' },
      { id: 'rare', label: 'Rarely' },
      { id: 'hardly', label: 'Hardly ever' },
    ],
  },
  {
    id: 'exercise-sitting',
    domain: 'exercise_longevity',
    text: 'How much of your day is spent sitting?',
    choices: [
      { id: 'active', label: 'Mostly active or standing' },
      { id: 'mixed', label: 'Mixed — I move around' },
      { id: 'mostly-sit-breaks', label: 'Most of the day, with breaks' },
      { id: 'mostly-sit-still', label: 'Most of the day, very still' },
    ],
  },
  {
    id: 'exercise-mobility',
    domain: 'exercise_longevity',
    text: 'Do you stretch, do yoga, or work on mobility?',
    choices: [
      { id: 'daily', label: 'Daily practice' },
      { id: 'few-week', label: 'Once or twice a week' },
      { id: 'when-remember', label: 'When I remember' },
      { id: 'never', label: 'Never' },
    ],
  },
  {
    id: 'exercise-outdoors',
    domain: 'exercise_longevity',
    text: 'How often do you spend time outdoors?',
    choices: [
      { id: 'daily', label: 'Daily' },
      { id: 'few-week', label: 'A few times a week' },
      { id: 'weekends', label: 'Weekends only' },
      { id: 'rare', label: 'Rarely' },
    ],
  },

  // ── Mental health ──────────────────────────────────────────────────────
  {
    id: 'mental-stress',
    domain: 'mental_health',
    text: 'How would you describe your stress level lately?',
    choices: [
      { id: 'calm', label: 'Calm, mostly under control' },
      { id: 'manageable', label: 'Manageable with effort' },
      { id: 'high', label: 'High most days' },
      { id: 'overwhelming', label: 'Overwhelming' },
    ],
  },
  {
    id: 'mental-mood',
    domain: 'mental_health',
    text: "How's your mood overall lately?",
    choices: [
      { id: 'good', label: 'Good — steady and positive' },
      { id: 'mixed', label: 'Mixed, depending on the day' },
      { id: 'low', label: 'Often low or flat' },
      { id: 'persistently-low', label: 'Persistently down or anxious' },
    ],
  },
  {
    id: 'mental-mindfulness',
    domain: 'mental_health',
    text: 'Do you have any kind of mindfulness or reflection practice?',
    choices: [
      { id: 'daily', label: 'Daily (meditation, journaling, etc.)' },
      { id: 'few-week', label: 'A few times a week' },
      { id: 'tried-no-stick', label: "I've tried but it didn't stick" },
      { id: 'no', label: 'Not really' },
    ],
  },
  {
    id: 'mental-social',
    domain: 'mental_health',
    text: 'How connected do you feel to people you care about?',
    choices: [
      { id: 'very', label: 'Very — regular meaningful contact' },
      { id: 'some', label: 'Some good connections' },
      { id: 'isolated', label: 'I feel a bit isolated' },
      { id: 'lonely', label: 'Often lonely' },
    ],
  },
  {
    id: 'mental-focus',
    domain: 'mental_health',
    text: "How's your focus during the day?",
    choices: [
      { id: 'sharp', label: 'Sharp, deep work feels easy' },
      { id: 'decent', label: 'Decent, with usual distractions' },
      { id: 'scattered', label: 'Scattered, hard to settle' },
      { id: 'bouncing', label: 'I bounce between things constantly' },
    ],
  },
  {
    id: 'mental-nature',
    domain: 'mental_health',
    text: 'How often do you spend time in nature (parks, trails, green spaces)?',
    choices: [
      { id: 'daily', label: 'Daily' },
      { id: 'few-week', label: 'A few times a week' },
      { id: 'occasional', label: 'Occasionally' },
      { id: 'rare', label: 'Rarely' },
    ],
  },

  // ── Cross-domain / lifestyle ───────────────────────────────────────────
  {
    id: 'goal-primary',
    domain: 'general',
    text: 'If one part of your health improved in the next 3 months, which would matter most?',
    choices: [
      { id: 'energy', label: 'More energy through the day' },
      { id: 'sleep', label: 'Better sleep' },
      { id: 'fitness', label: 'Stronger / fitter body' },
      { id: 'mind', label: 'Calmer mind' },
    ],
  },
  {
    id: 'constraint-time',
    domain: 'general',
    text: 'How much time can you realistically give a new habit each day?',
    choices: [
      { id: 'under-5', label: '5 minutes or less' },
      { id: '5to15', label: '5–15 minutes' },
      { id: '15to30', label: '15–30 minutes' },
      { id: '30plus', label: '30+ minutes' },
    ],
  },
  {
    id: 'lifestyle-rhythm',
    domain: 'general',
    text: 'How would you describe your daily rhythm?',
    choices: [
      { id: 'structured', label: 'Structured, predictable schedule' },
      { id: 'mostly-steady', label: 'Mostly steady with some variation' },
      { id: 'weekly-shifts', label: 'Shifts week to week' },
      { id: 'irregular', label: 'Very irregular (shift work, travel, etc.)' },
    ],
  },
  {
    id: 'past-habits',
    domain: 'general',
    text: "What's your history with health habits that stuck?",
    choices: [
      { id: 'several-stuck', label: "I've built several lasting ones" },
      { id: 'one-or-two', label: "One or two stuck, most didn't" },
      { id: 'drop-off', label: 'I start strong then drop off' },
      { id: 'new', label: "I haven't tried much yet" },
    ],
  },
  {
    id: 'motivation-style',
    domain: 'general',
    text: 'What gets you to actually follow through?',
    choices: [
      { id: 'data', label: 'Data and tracking' },
      { id: 'routine', label: 'Routine and triggers' },
      { id: 'social', label: 'Social support / accountability' },
      { id: 'purpose', label: 'Doing it for someone or something else' },
    ],
  },
  {
    id: 'what-tried',
    domain: 'general',
    text: 'Have you tried any health programs, apps, or protocols recently?',
    choices: [
      { id: 'currently', label: 'Yes, currently using something' },
      { id: 'past', label: 'Yes, in the past' },
      { id: 'briefly', label: "Briefly, didn't continue" },
      { id: 'new', label: 'No, this would be new' },
    ],
  },
];

export const QUESTION_POOL_BY_ID: Readonly<Record<string, PoolQuestion>> =
  Object.freeze(
    Object.fromEntries(QUESTION_POOL.map((q) => [q.id, q])),
  );

export type PoolQuestionId = (typeof QUESTION_POOL)[number]['id'];
