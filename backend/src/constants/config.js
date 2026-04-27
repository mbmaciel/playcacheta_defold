const DEFAULT_DEV_API_URL = 'http://localhost:3001';
const DEFAULT_PROD_API_URL = 'https://api.playcacheta.online';

const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL)
).replace(/\/+$/, '');

export { DEFAULT_DEV_API_URL, DEFAULT_PROD_API_URL, apiBaseUrl };
