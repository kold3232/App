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
