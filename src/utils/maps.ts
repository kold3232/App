import { Linking } from 'react-native';
import { notify } from './alert';

/**
 * A plain Google Maps search link rather than an embedded map.
 *
 * react-native-maps would mean a config plugin and per-platform API keys, and
 * what a tradesman actually wants is directions — which they get better from
 * the real Maps app, along with live traffic and their own saved places.
 *
 * ", Gibraltar" is appended because addresses here are entered as estate and
 * flat ("24 Orsova House, Varyl Begg") with no town or postcode, which on its
 * own could resolve almost anywhere.
 */
export function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Gibraltar`)}`;
}

export async function openInMaps(address: string) {
  try {
    await Linking.openURL(googleMapsUrl(address));
  } catch {
    notify('Could not open Maps', 'No maps app is available on this device.');
  }
}

export async function callNumber(phone: string) {
  try {
    await Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  } catch {
    notify('Could not start the call', 'This device cannot place calls.');
  }
}
