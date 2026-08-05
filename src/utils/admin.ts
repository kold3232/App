export type InsuranceStatus = 'ok' | 'expiring' | 'expired' | 'missing';

export function getInsuranceStatus(expiryDate?: string): InsuranceStatus {
  if (!expiryDate) return 'missing';
  const [day, month, year] = expiryDate.split('/').map(Number);
  if (!day || !month || !year) return 'missing';
  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'expiring';
  return 'ok';
}
