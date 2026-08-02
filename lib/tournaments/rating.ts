// Rating formula: symmetric around the field's median finish, scaled by
// field size — top half of the field gains rating, bottom half loses it,
// by the same amount for the same relative finish. A 45-player field swings
// ratings more than a 10-player one (sqrt(playerCount / REFERENCE_FIELD)),
// since beating (or getting beaten by) a bigger field means more. This
// keeps rating a genuine competitive signal rather than a number that only
// ever goes up the more you play.
//
// percentile: 1st place -> 1.0, last place -> 0.0, exact median -> 0.5.
// pointsEarned: 0 at the median, +/-BASE_SWING*sqrt(field/REFERENCE_FIELD)
// at the extremes.
const BASE_SWING = 40;
const REFERENCE_FIELD = 10;

export function computeRatingChange(
  oldRating: number,
  place: number,
  playerCount: number,
): { pointsEarned: number; newRating: number } {
  if (playerCount <= 1) return { pointsEarned: 0, newRating: oldRating };

  const percentile = (playerCount - place) / (playerCount - 1);
  const pointsEarned = Math.round((percentile - 0.5) * BASE_SWING * Math.sqrt(playerCount / REFERENCE_FIELD));
  return { pointsEarned, newRating: oldRating + pointsEarned };
}
