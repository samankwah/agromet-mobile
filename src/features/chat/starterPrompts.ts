/**
 * What a farmer sees before they have asked anything.
 *
 * Hardcoded rather than drawn from `/api/faq`, even though four published
 * answers exist and `useFaqs` still reads them. Those four are reserved for the
 * Mobile Menu, and a starter prompt has a different job anyway: it teaches the
 * range of what can be asked, so the list deliberately spans planting, weather,
 * pests and prices rather than clustering on one topic.
 *
 * Kept to four. A chip grid taller than the keyboard stops reading as
 * suggestions and starts reading as a menu the farmer must choose from.
 */
export const STARTER_PROMPTS = [
  'When should I plant maize this season?',
  'Is the rain coming this week?',
  'My tomato leaves are curling — what is wrong?',
  'How do I store my harvest to avoid losses?',
] as const;
