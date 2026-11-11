export const STORAGE_KEY = 'lunarbase-mission-v1';

export function readStoredMission() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.day ? parsed : null;
  } catch (error) {
    console.warn('Saved mission was corrupted or unreadable.', error);
    return null;
  }
}

export function writeStoredMission(mission) {
  if (!mission || typeof mission !== 'object') {
    return;
  }

  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(mission));
}

export function clearStoredMission() {
  globalThis.localStorage?.removeItem(STORAGE_KEY);
}
