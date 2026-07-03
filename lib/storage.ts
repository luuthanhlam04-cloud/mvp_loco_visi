import { Itinerary } from './zod-schemas';

const STORAGE_KEY = 'loco_itinerary_history';
const MAX_HISTORY = 5;

export const getHistory = (): Itinerary[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get history from localStorage:', error);
    return [];
  }
};

export const saveToHistory = (itinerary: Itinerary) => {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    const newHistory = [itinerary, ...history].slice(0, MAX_HISTORY);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e: unknown) {
      if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([itinerary]));
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('Failed to save history to localStorage:', error);
  }
};
