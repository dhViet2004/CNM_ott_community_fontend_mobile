import { uploadApi } from '@api';

/**
 * Resolves a potentially raw S3 key or Amazon URL into a viewable URL.
 */
export const resolveUrl = async (url?: string | null): Promise<string | undefined> => {
  if (!url) return undefined;
  
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // If it's already a full HTTP URL and NOT an amazonaws URL, return as is
  // (Note: we still resolve amazonaws URLs because they might be expired S3 keys)
  if (trimmed.startsWith('http') && !trimmed.includes('amazonaws.com')) {
    return trimmed;
  }

  try {
    const res = await uploadApi.getViewUrl(trimmed);
    return res.view_url;
  } catch (err) {
    console.warn('[resolveUrl] Failed to resolve URL:', trimmed, err);
    return trimmed.startsWith('http') ? trimmed : undefined;
  }
};
