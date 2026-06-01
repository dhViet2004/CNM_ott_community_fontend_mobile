import { uploadApi } from '@api';

/**
 * Resolves a potentially raw S3 key or Amazon URL into a viewable URL.
 */
export const resolveUrl = async (url?: string | null): Promise<string | undefined> => {
  if (!url) return undefined;
  
  let trimmed = url.trim();
  if (!trimmed) return undefined;

  // Dynamically replace any old IP / host (e.g. 192.168.2.47, 192.168.2.20, localhost) with the current EXPO_PUBLIC_API_URL host
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  const matchHost = apiUrl.match(/https?:\/\/([^\/]+)/);
  const currentHost = matchHost ? matchHost[1] : 'localhost:4000';

  // Match any local LAN IP (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x) or localhost/127.0.0.1, with optional port
  const lanIpRegex = /(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(?::\d+)?/g;

  trimmed = trimmed.replace(lanIpRegex, currentHost);

  // If it's already a full HTTP URL and NOT an amazonaws URL, return as is
  if (trimmed.startsWith('http') && !trimmed.includes('amazonaws.com')) {
    return trimmed;
  }

  try {
    const res = await uploadApi.getViewUrl(trimmed);
    let viewUrl = res.viewUrl || res.view_url;
    if (viewUrl) {
      viewUrl = viewUrl.replace(lanIpRegex, currentHost);
    }
    return viewUrl;
  } catch (err) {
    console.warn('[resolveUrl] Failed to resolve URL:', trimmed, err);
    return trimmed.startsWith('http') ? trimmed : undefined;
  }
};
