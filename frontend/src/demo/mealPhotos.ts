import photos from './meal-photos.json';

/** Local source photographs shared by recommendation cards and recipe details. */
export function mealPhoto(id: string): string | undefined {
  return photos.find(photo => photo.id === id)?.src;
}
