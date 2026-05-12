import { themeOptions } from '../../app/app-utils.js';

export default function ThemeControl({ theme, setTheme }) {
  return (
    <div className="theme-picker settings-theme">
      <span>Tema do site</span>
      <div className="theme-switcher" role="radiogroup" aria-label="Selecionar tema">
        {themeOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`theme-option ${theme === option.id ? 'is-active' : ''}`}
            aria-pressed={theme === option.id}
            onClick={() => setTheme(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
