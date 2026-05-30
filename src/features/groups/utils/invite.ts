export function parseGroupInviteCode(value: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const pipeParts = raw.split('|');
  if (pipeParts[0] === 'OTT_GR' && pipeParts[1] === '1' && pipeParts[2]) {
    return pipeParts[2].trim() || null;
  }

  try {
    const url = new URL(raw);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const joinIndex = pathParts.findIndex((part) => part.toLowerCase() === 'join');
    if (joinIndex >= 0 && pathParts[joinIndex + 1]) {
      return decodeURIComponent(pathParts[joinIndex + 1]).trim() || null;
    }

    const queryCode =
      url.searchParams.get('inviteCode') ||
      url.searchParams.get('invite') ||
      url.searchParams.get('code');
    if (queryCode?.trim()) {
      return queryCode.trim();
    }
  } catch {
    // Not a URL; continue with plain invite-code parsing.
  }

  if (/^[a-fA-F0-9]{8}$/.test(raw)) {
    return raw;
  }

  return null;
}
