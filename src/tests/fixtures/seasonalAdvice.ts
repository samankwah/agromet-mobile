/** A `/api/outlook/seasonal/advice/{region}` payload: Greater Accra, a late start. */
export function advicePayload(overrides: Record<string, unknown> = {}) {
  const forecast = (display: string, normalDisplay: string, category: 'below' | 'normal' | 'above') => ({
    available: true,
    display,
    normalDisplay,
    probabilities: category === 'above' ? { below: 0.15, normal: 0.25, above: 0.6 } : { below: 0.25, normal: 0.5, above: 0.25 },
    category,
    confidence: 'high',
    members: 51,
  });
  const item = (variable: string, label: string, condition: string, title: string, reading: object, actions: string[]) => ({
    variable,
    label,
    condition,
    title,
    summary: `${title}.`,
    actions,
    reading,
  });
  const later = 'Check the 7 day forecast before you plant.';

  return {
    region: 'Greater Accra',
    season: { key: 'southern-major', label: 'Southern Major Season', year: 2027 },
    window: { key: 'MAM', label: 'March to May', year: 2027 },
    headline: 'The rains may start later than usual.',
    conditions: [
      item('onset', 'Rains start', 'late', 'Rains may start late', forecast('Week 4 of March', 'Week 2 of March', 'above'), [
        'Wait for the rains to settle before you plant.',
        later,
      ]),
      item('earlyDrySpell', 'Early dry spell', 'usual', 'Usual dry spells after planting', forecast('5 days', '5 days', 'normal'), [
        'Mulch where you can.',
        later,
      ]),
      item('lateDrySpell', 'Late dry spell', 'long', 'Long dry spell late in the season', forecast('9 days', '6 days', 'above'), [
        'Plant early maturing seed so the crop flowers before the dry spell.',
      ]),
      item('cessation', 'Rains end', 'usual', 'Rains should end on time', forecast('Week 1 of July', 'Week 1 of July', 'normal'), [
        'Plan your harvest for the usual time.',
      ]),
      item('rainfallTotal', 'Rainfall', 'more', 'More rain than usual', forecast('420 mm', '360 mm', 'above'), [
        'Clear drains, and make raised beds in low fields.',
      ]),
      item('rainyDays', 'Rainy days', 'usual', 'About the usual rainy days', forecast('38 days', '37 days', 'normal'), [
        'Follow your usual plan.',
      ]),
      item('temperature', 'Temperature', 'usual', 'About the usual heat', forecast('31.2°C', '31.0°C', 'normal'), [
        'Keep birds and animals in the shade at midday.',
      ]),
    ],
    note: 'This advice is worked out from the seasonal outlook. It is not an official advisory.',
    source: 'rules',
    issuedBy: null,
    issuedAt: null,
    outlookSource: 'seas5',
    outlookIssuedBy: null,
    runDate: '2026-10-05',
    unavailable: false,
    ...overrides,
  };
}
