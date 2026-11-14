/**
 * Form pictures for rehab exercises, from wger.de (CC-BY-SA, the same source the workout
 * thumbnails use). Only exercises with a genuine match are listed; the rest show their
 * written steps without a picture rather than a wrong one. openGym's own media is
 * proprietary and deliberately not used (see src/data/exercises/NOTICE.md).
 */
const WGER = "https://wger.de/media/exercise-images";

const IMAGES: Record<string, string> = {
  "childs-pose": `${WGER}/1002/ddf91765-8045-4087-bece-de17f33332ce.png`,
  "supine-hamstring-stretch": `${WGER}/1870/7465bbcf-3b86-42a6-8d2f-12a3d1f60a15.png`,
  "glute-bridge": `${WGER}/265/7528acb4-b2cc-4b75-b6ae-d514cbd4f78b.png`,
  "bird-dog": `${WGER}/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png`,
  "front-plank": `${WGER}/1307/321d796a-f394-40b8-a1ea-874bbed6ecee.png`,
  "hip-flexor-stretch": `${WGER}/1867/767631e5-10d2-46b8-b03f-cc298f96963b.png`,
  "quad-stretch": `${WGER}/2687/c0ed299b-6d87-4d90-885d-bb3b5d85f1eb.png`,
  "calf-stretch": `${WGER}/1239/5026373a-a7b4-4e26-a0aa-c46634205196.jpg`
};

export function rehabImage(exerciseId: string): string | undefined {
  return IMAGES[exerciseId];
}
