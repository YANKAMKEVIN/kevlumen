/** Le canvas du jeu et son contexte 2D. */
export const cv = document.getElementById('c') as HTMLCanvasElement;
export const ctx = cv.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
