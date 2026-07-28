const STATE_KEY = 'momo-avatar-maker-state-v12';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadStoredState(fallback) {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return clone(fallback);
    return { ...clone(fallback), ...JSON.parse(raw) };
  } catch {
    return clone(fallback);
  }
}

export function saveStoredState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}
