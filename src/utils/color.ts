const PALETTE = ['#2454E8', '#173CB8', '#0F1E46', '#3B6BFF', '#1F3A93', '#274690', '#1E56B0'];

export function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
