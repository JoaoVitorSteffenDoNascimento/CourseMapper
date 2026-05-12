// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AnalyticsPage from './AnalyticsPage.jsx';
import CurriculumPage from './CurriculumPage.jsx';
import OverviewPage from './OverviewPage.jsx';
import SettingsPage from './SettingsPage.jsx';

const user = {
  name: 'Lucas Demo',
  username: 'lucas',
  registration: '2026000001',
  email: 'lucas@example.com',
  courseId: 'cc',
  avatarUrl: '',
};

const curriculums = [
  { id: 'cc', name: 'Ciencia da Computacao' },
];

const mapData = {
  course: { id: 'cc', name: 'Ciencia da Computacao', trailLabels: ['Base', 'Dev'] },
  stats: {
    totalSubjects: 3,
    completedCount: 1,
    availableCount: 1,
    lockedCount: 1,
    completionRate: 33,
    remainingCriticalSemesters: 2,
  },
  subjects: [
    { id: 'CC101', name: 'Introducao', semester: 1, trail: 'Base', prerequisites: [], corequisites: [], status: 'completed', isCritical: true },
    { id: 'CC201', name: 'Algoritmos', semester: 2, trail: 'Dev', prerequisites: ['CC101'], corequisites: [], status: 'available', isCritical: true },
    { id: 'CC301', name: 'Projeto', semester: 3, trail: 'Dev', prerequisites: ['CC201'], corequisites: [], status: 'locked', isCritical: false },
  ],
};

describe('pages', () => {
  afterEach(() => {
    cleanup();
  });

  it('OverviewPage mostra metricas e chama navegacao', () => {
    const onNavigate = vi.fn();
    render(<OverviewPage mapData={mapData} user={user} curriculums={curriculums} onNavigate={onNavigate} />);

    expect(screen.getByText(/Lucas/i)).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getAllByText('Algoritmos')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /curr/i }));
    expect(onNavigate).toHaveBeenCalledWith('curriculum');
  });

  it('CurriculumPage renderiza semestres e bloqueia disciplina travada', () => {
    const onToggleSubject = vi.fn();
    render(<CurriculumPage mapData={mapData} actionLoadingId="" onToggleSubject={onToggleSubject} />);

    fireEvent.click(screen.getByRole('button', { name: /Algoritmos/i }));
    expect(onToggleSubject).toHaveBeenCalledWith(mapData.subjects[1]);
    expect(screen.getByRole('button', { name: /Projeto/i })).toBeDisabled();
  });

  it('AnalyticsPage mostra conclusao e resumo por trilha', () => {
    render(<AnalyticsPage mapData={mapData} />);

    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.getByText('Dev')).toBeTruthy();
  });

  it('SettingsPage permite disparar salvamento de perfil e importacao', () => {
    const onSaveProfile = vi.fn((event) => event.preventDefault());
    const onImportCurriculum = vi.fn((event) => event.preventDefault());

    render(
      <SettingsPage
        user={user}
        settingsForm={{ ...user, theme: 'brand' }}
        setSettingsForm={vi.fn()}
        onSaveProfile={onSaveProfile}
        onImportCurriculum={onImportCurriculum}
        importForm={{ fileData: '', fileName: '', mimeType: '', sourceText: 'grade' }}
        setImportForm={vi.fn()}
        importLoading={false}
        importError=""
        importSuccess=""
        settingsLoading={false}
        settingsError=""
        settingsSuccess=""
        setTheme={vi.fn()}
        hasSettingsChanges
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Salvar configura/i }));
    fireEvent.click(screen.getByRole('button', { name: /Importar grade/i }));

    expect(onSaveProfile).toHaveBeenCalled();
    expect(onImportCurriculum).toHaveBeenCalled();
  });
});
