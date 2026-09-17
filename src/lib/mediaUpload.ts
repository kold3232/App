import { decode } from 'base64-arraybuffer';
// SDK 54 moved the readAsStringAsync/EncodingType API behind the /legacy subpath.
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export async function uploadBusinessMedia(
  businessId: string,
  localUri: string,
  path: string
): Promise<{ url?: string; error?: string }> {
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const fullPath = `${businessId}/${path}`;
    const { error: uploadError } = await supabase.storage
      .from('business-media')
      .upload(fullPath, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (uploadError) return { error: uploadError.message };
    const { data } = supabase.storage.from('business-media').getPublicUrl(fullPath);
    return { url: `${data.publicUrl}?v=${Date.now()}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

/**
 * Uploads a verification document to the private business-documents bucket.
 *
 * Unlike uploadBusinessMedia this returns a storage path, not a URL: the
 * bucket is private, so there is no public URL to hand out. Insurance
 * certificates and IDs have no business sitting on a guessable address.
 */
export async function uploadBusinessDocument(
  businessId: string,
  localUri: string,
  fileName: string,
  contentType: string
): Promise<{ path?: string; error?: string }> {
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    const fullPath = `${businessId}/${Date.now()}-${fileName}`;
    const { error } = await supabase.storage
      .from('business-documents')
      .upload(fullPath, decode(base64), { contentType, upsert: false });
    if (error) return { error: error.message };
    return { path: fullPath };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

/** Short-lived link so an admin can open a private document. */
export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('business-documents').createSignedUrl(path, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}
