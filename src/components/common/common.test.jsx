// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Avatar from './Avatar.jsx';
import ThemeControl from './ThemeControl.jsx';

describe('common components', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza iniciais quando o usuario nao possui avatar', () => {
    render(<Avatar user={{ name: 'Lucas Demo' }} />);

    expect(screen.getByText('LD')).toBeTruthy();
  });

  it('renderiza imagem quando avatarUrl existe', () => {
    render(<Avatar user={{ name: 'Lucas Demo', avatarUrl: 'data:image/png;base64,abc' }} large />);

    const image = screen.getByRole('img', { name: /foto de perfil/i });
    expect(image).toHaveAttribute('src', 'data:image/png;base64,abc');
    expect(image).toHaveClass('large');
  });

  it('permite selecionar um tema', () => {
    const setTheme = vi.fn();
    render(<ThemeControl theme="brand" setTheme={setTheme} />);

    expect(screen.getByRole('button', { name: 'Verde' })).toHaveClass('is-active');
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
