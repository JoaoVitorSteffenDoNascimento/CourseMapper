// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AuthScreen from './AuthScreen.jsx';

const curriculums = [
  {
    id: 'cc-2026',
    code: 'CC',
    baseCode: 'CC',
    name: 'Computacao',
    catalogName: 'Computacao',
    catalogKey: 'cc',
    versionLabel: '2026',
  },
];

function renderAuthScreen(overrides = {}) {
  const props = {
    authMode: 'login',
    form: { name: '', registration: '', email: '', password: '', courseId: 'cc-2026' },
    setForm: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
    setAuthMode: vi.fn(),
    loading: false,
    error: '',
    curriculums,
    ...overrides,
  };

  render(<AuthScreen {...props} />);
  return props;
}

describe('AuthScreen', () => {
  afterEach(() => {
    cleanup();
  });

  it('mostra campos de login e alterna para cadastro', () => {
    const props = renderAuthScreen();

    expect(screen.getByLabelText(/matr/i)).toBeTruthy();
    expect(screen.getByLabelText(/senha/i)).toBeTruthy();
    expect(screen.queryByLabelText(/nome completo/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar-se' }));
    expect(props.setAuthMode).toHaveBeenCalledWith('register');
  });

  it('mostra campos de cadastro e opcoes de curso agrupadas', () => {
    renderAuthScreen({ authMode: 'register' });

    expect(screen.getByLabelText(/nome completo/i)).toBeTruthy();
    expect(screen.getByLabelText(/e-mail/i)).toBeTruthy();
    expect(screen.getByRole('option', { name: /CC/i })).toHaveValue('cc-2026');
  });

  it('formata matricula antes de atualizar o estado', () => {
    const setForm = vi.fn((updater) => updater({ registration: '' }));
    renderAuthScreen({ setForm });

    fireEvent.change(screen.getByLabelText(/matr/i), { target: { value: '2026000001' } });

    expect(setForm).toHaveBeenCalled();
    expect(setForm.mock.results[0].value.registration).toBe('2026 000001');
  });
});
