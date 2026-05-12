const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_LOCAL_FALLBACK_URL = 'http://localhost:3001/api';
const API_REMOTE_FALLBACK_URL = import.meta.env.VITE_API_REMOTE_FALLBACK_URL || 'https://dacgp1-joao.onrender.com/api';

const shouldUseLocalApiFallback = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

async function parseApiResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('A API retornou HTML em vez de JSON. Reinicie o backend para carregar as rotas mais recentes.');
  }

  throw new Error(text || 'Resposta inválida da API.');
}

function createApiError(message, status = 0) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function shouldRetryWithFallback(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const retryableStatuses = new Set([404, 405, 502, 503, 504]);

  if (retryableStatuses.has(error.status)) {
    return true;
  }

  return [
    'A API retornou HTML em vez de JSON. Reinicie o backend para carregar as rotas mais recentes.',
    'Rota da API nao encontrada.',
    'Falha ao conectar com o backend remoto.',
    'Failed to fetch',
  ].includes(error.message);
}

function getApiFallbackUrl() {
  if (shouldUseLocalApiFallback()) {
    return API_LOCAL_FALLBACK_URL;
  }

  return API_REMOTE_FALLBACK_URL;
}

export async function apiRequest(path, options = {}, token = '') {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  async function runRequest(baseUrl) {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const data = await parseApiResponse(response);

    if (!response.ok) {
      throw createApiError(data?.error || 'Algo deu errado.', response.status);
    }

    return data;
  }

  try {
    return await runRequest(API_BASE_URL);
  } catch (error) {
    const fallbackUrl = getApiFallbackUrl();
    const shouldRetry =
      fallbackUrl &&
      fallbackUrl !== API_BASE_URL &&
      shouldRetryWithFallback(error);

    if (!shouldRetry) {
      throw error;
    }

    return runRequest(fallbackUrl);
  }
}
