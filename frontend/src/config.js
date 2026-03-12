/**
 * ⚙️ CONFIGURAÇÃO GLOBAL DO FRONTEND
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const API_URL = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;

export default {
  API_URL,
  VERSION: '1.0.0',
  ENV: process.env.NODE_ENV || 'development'
};
