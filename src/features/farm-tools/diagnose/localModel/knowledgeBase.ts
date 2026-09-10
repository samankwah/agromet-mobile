import type { CassavaClassId } from './labels';

/**
 * What each class the model can predict actually means for a farmer.
 *
 * The model returns an index and a score. That is not a diagnosis anyone can
 * act on, so the advice has to come from somewhere, and offline it cannot come
 * from the provider the way the online path's does. It comes from here: written
 * once, bundled with the app, and available with no network at all.
 *
 * Scope note: the model classifies cassava only. Every entry below is cassava,
 * and `adapter.ts` will not return one of these for any other crop.
 *
 * REVIEW STATUS: drafted from published cassava disease management guidance and
 * NOT yet reviewed by an extension officer. It must be before the app is put in
 * front of a farmer. Advice that is confidently wrong about a crop disease costs
 * somebody a harvest, and the model's score says nothing about whether the text
 * attached to a class is sound.
 */

export type CassavaDiseaseInfo = {
  /** Shown as the finding. Full name first, because the abbreviation means
   * nothing to a farmer and everything to an extension officer. */
  displayName: string;
  severity: 'low' | 'moderate' | 'high';
  /** One-piece prose, used when the structured lists are not what the screen
   * needs. Mirrors the `remedy` field the backend sends. */
  summary: string;
  immediateActions: string[];
  preventionGuidance: string[];
};

export const CASSAVA_KNOWLEDGE_BASE: Record<CassavaClassId, CassavaDiseaseInfo> = {
  cbb: {
    displayName: 'Cassava Bacterial Blight',
    severity: 'high',
    summary:
      'A bacterial disease that spreads in wet conditions and through infected cuttings and tools. It shows as angular water-soaked spots on leaves, which dry into brown patches, followed by wilting, stem dieback and gum oozing from stems. It can take a large share of the yield when it takes hold early.',
    immediateActions: [
      'Remove badly affected plants, including the stems, and burn them away from the field.',
      'Stop taking cuttings from any plant in the affected area.',
      'Clean cutlasses and other tools with soap or a bleach solution before moving to a clean part of the farm.',
      'Avoid weeding or harvesting while the leaves are still wet, because the bacteria move in water.',
    ],
    preventionGuidance: [
      'Plant only cuttings from healthy fields, or certified planting material from CSIR Crops Research Institute or your district MoFA office.',
      'Rotate cassava with a non host crop such as maize or a legume for at least one season before replanting.',
      'Space plants so air moves between them and leaves dry quickly after rain.',
      'Ask your extension officer which tolerant varieties are being distributed in your district.',
    ],
  },
  cbsd: {
    displayName: 'Cassava Brown Streak Disease',
    severity: 'high',
    summary:
      'A virus spread by whiteflies and by planting infected cuttings. Leaves show yellow blotches along the veins and stems may carry brown streaks. The serious damage is underground: the roots develop a dry brown rot that is often not visible until harvest, so a crop that looks acceptable in the field can still be lost.',
    immediateActions: [
      'Check a few roots from an affected plant now rather than waiting for harvest, so you know what you are dealing with.',
      'Pull out and destroy plants showing clear vein yellowing, and do not leave them at the field edge.',
      'Harvest affected areas earlier than planned, because root rot gets worse the longer the crop stays in the ground.',
      'Do not keep cuttings from this field for the next planting.',
    ],
    preventionGuidance: [
      'Source planting material from a clean field or a certified supplier every season. This is the single most effective step.',
      'Ask your extension officer for tolerant varieties, because there is no spray that cures a virus once a plant has it.',
      'Control whiteflies, and keep the field free of the weeds they shelter in.',
      'Inspect the field every two to three weeks and remove new infections early, while they are still few.',
    ],
  },
  cgm: {
    displayName: 'Cassava Green Mottle',
    severity: 'moderate',
    summary:
      'A virus that shows as green mottling on young leaves, with puckering, twisting and narrowing of the leaf blade. Affected plants often grow out of the worst symptoms and can still produce a reasonable harvest, so it is usually less damaging than mosaic or brown streak disease.',
    immediateActions: [
      'Mark the affected plants and watch them over the next few weeks, because new growth often comes out looking normal.',
      'Remove plants that stay badly stunted or distorted.',
      'Do not take cuttings from affected plants, even if they appear to recover.',
    ],
    preventionGuidance: [
      'Use planting material from a field with no history of mottling.',
      'Keep the field weeded, since weeds host the insects that move viruses between plants.',
      'Report an unusual spread to your extension officer, because a rapid increase usually means the planting material was already infected.',
    ],
  },
  cmd: {
    displayName: 'Cassava Mosaic Disease',
    severity: 'high',
    summary:
      'The most widespread cassava disease in Ghana. It is a virus carried by whiteflies and by infected cuttings, and it shows as a yellow and green mosaic pattern on the leaves, with distorted, narrowed leaves and stunted plants. Plants infected through their cuttings are affected worst, because they are diseased from the day they are planted.',
    immediateActions: [
      'Uproot severely stunted plants with heavy mosaic and destroy them, because they will not produce a worthwhile root harvest.',
      'Leave mildly affected plants that were infected later in the season, since they can still yield.',
      'Mark this field so no cuttings are taken from it for the next planting.',
    ],
    preventionGuidance: [
      'Plant a resistant variety. This is the main defence, and your district MoFA office or CSIR Crops Research Institute can advise on what is available locally.',
      'Always plant clean cuttings. Cuttings from an infected plant carry the virus into the new crop.',
      'Walk the field regularly in the first two months and remove infected plants while the crop is young.',
      'Control whiteflies and clear nearby weeds and volunteer cassava that keep the virus in the area.',
    ],
  },
  healthy: {
    displayName: 'No disease detected',
    severity: 'low',
    summary:
      'The leaf in this photo does not show the disease patterns the model was trained to recognise. This is not a clean bill of health for the whole farm: it is one leaf, in one photo, checked against four cassava diseases.',
    immediateActions: [
      'If you photographed this plant because something looked wrong, photograph a different leaf and try again.',
      'Check other plants across the field rather than judging the crop by one plant.',
    ],
    preventionGuidance: [
      'Keep using clean planting material, since most serious cassava diseases arrive in the cuttings.',
      'Walk the field every two to three weeks so a new problem is caught while it is still small.',
      'Take a photo when you first notice something unusual, rather than waiting for it to spread.',
    ],
  },
};
