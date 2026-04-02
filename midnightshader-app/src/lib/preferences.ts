export const REDUCED_MOTION_KEY = 'midnightshader:prefer-reduced-motion'

export function readReducedMotionPreference(): boolean {
  try {
    return localStorage.getItem(REDUCED_MOTION_KEY) === '1'
  } catch {
    return false
  }
}

export function applyReducedMotionFromStorage() {
  if (readReducedMotionPreference()) {
    document.documentElement.classList.add('reduced-motion')
  } else {
    document.documentElement.classList.remove('reduced-motion')
  }
}

export function setReducedMotionPreference(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(REDUCED_MOTION_KEY, '1')
    else localStorage.removeItem(REDUCED_MOTION_KEY)
  } catch {
    /* private mode */
  }
  applyReducedMotionFromStorage()
}
