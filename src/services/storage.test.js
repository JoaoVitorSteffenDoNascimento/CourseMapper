// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getStoredTheme,
  getStoredToken,
  setStoredTheme,
  setStoredToken,
} from './storage.js';

describe('storage service', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persiste e remove o token de sessao', () => {
    expect(getStoredToken()).toBe('');

    setStoredToken('token-demo');
    expect(getStoredToken()).toBe('token-demo');

    setStoredToken('');
    expect(getStoredToken()).toBe('');
  });

  it('usa brand como tema padrao e salva a escolha do usuario', () => {
    expect(getStoredTheme()).toBe('brand');

    setStoredTheme('dark');
    expect(getStoredTheme()).toBe('dark');
  });
});
