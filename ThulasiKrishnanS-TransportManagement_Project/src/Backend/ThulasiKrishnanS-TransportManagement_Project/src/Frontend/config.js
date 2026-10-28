// API Configuration
const API_BASE_URL = window.location.protocol === 'https:' ? 'https://' : 'http://';
const API_HOST = window.location.hostname;
const API_PORT = '5000';

// For localhost development, always use HTTP to avoid certificate issues
const isLocalhost = API_HOST === 'localhost' || API_HOST === '127.0.0.1';
const finalProtocol = isLocalhost ? 'http://' : API_BASE_URL;

// Dynamic configuration based on environment
export const API_URL = `${finalProtocol}${API_HOST}:${API_PORT}`;
export const SOCKET_URL = `${finalProtocol}${API_HOST}:${API_PORT}`;
