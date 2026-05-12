// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from './api.js';

function jsonResponse(data, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

describe('api service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('retorna JSON e envia o bearer token quando informado', async () => {
    const fetchMock = vi.fn(() => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/health', {}, 'token-demo')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/api/health', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-demo',
      },
    });
  });

  it('propaga o erro de negocio retornado pela API', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ error: 'Credenciais invalidas.' }, 401)));

    await expect(apiRequest('/auth/login', { method: 'POST' })).rejects.toMatchObject({
      message: 'Credenciais invalidas.',
      status: 401,
    });
  });

  it('tenta o fallback local quando a API base retorna erro temporario', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockImplementationOnce(() => jsonResponse({ ok: true, fallback: true }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/health')).resolves.toEqual({ ok: true, fallback: true });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/health',
      'http://localhost:3001/api/health',
    ]);
  });

  it('informa quando a API devolve HTML no lugar de JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<!DOCTYPE html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))));

    await expect(apiRequest('/health')).rejects.toThrow(/API retornou HTML/i);
  });
});
