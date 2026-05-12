const TOKEN_STORAGE_KEY = 'coursemapper_token';
const THEME_STORAGE_KEY = 'coursemapper_theme';

export const getStoredToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
export const setStoredToken = (token) => token ? window.localStorage.setItem(TOKEN_STORAGE_KEY, token) : window.localStorage.removeItem(TOKEN_STORAGE_KEY);
export const getStoredTheme = () => window.localStorage.getItem(THEME_STORAGE_KEY) || 'brand';
export const setStoredTheme = (theme) => window.localStorage.setItem(THEME_STORAGE_KEY, theme);
