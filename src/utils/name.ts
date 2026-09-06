// "John Smith" -> "John S.". Gibraltar is small enough that a full name is
// most of the way to a phone number, so requests carry this instead until the
// customer has accepted a quote.
export function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Customer';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
