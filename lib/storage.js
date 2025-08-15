import { supabase } from '@/lib/supabaseClient';

function extFromType(type) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
  return map[type] || 'jpg';
}

export async function uploadListingImages(files, userId) {
  const urls = [];
  for (const file of files) {
    const ext = extFromType(file.type);
    const id = crypto.randomUUID();
    const path = `${userId}/${id}.${ext}`;
    const { error } = await supabase.storage.from('listing-images').upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: '3600',
    });
    if (error) throw error;
    const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
