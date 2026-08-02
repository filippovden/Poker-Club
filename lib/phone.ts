// Russian numbers get typed as +7960…, 8960…, or bare 960… — the same
// physical number as three different strings — so anywhere a phone number
// is used as a persistent identity key (rating profiles) or search match,
// comparisons go through the last 10 digits rather than the raw string.
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}
