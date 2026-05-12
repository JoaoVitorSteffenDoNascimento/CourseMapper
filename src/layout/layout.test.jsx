// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import Dashboard from './Dashboard.jsx';
import Sidebar from './Sidebar.jsx';

const user = {
  name: 'Lucas Demo',
  username: 'lucas',
  registration: '2026000001',
  email: 'lucas@example.com',
  courseId: 'cc',
  avatarUrl: '',
};

const curriculums = [
  { id: 'cc', code: 'CC', baseCode: 'CC', name: 'Computacao', catalogName: 'Computacao', catalogKey: 'cc', versionLabel: 'Padrao' },
  { id: 'si', code: 'SI', baseCode: 'SI', name: 'Sistemas', catalogName: 'Sistemas', catalogKey: 'si', versionLabel: 'Padrao' },
];

const mapData = {
  course: { id: 'cc', code: 'CC', baseCode: 'CC', name: 'Computacao', versionLabel: 'Padrao', trailLabels: ['Base'] },
  stats: { totalSubjects: 1, completedCount: 0, availableCount: 1, lockedCount: 0, completionRate: 0, remainingCriticalSemesters: 1 },
  subjects: [
    { id: 'CC101', name: 'Intro', semester: 1, trail: 'Base', prerequisites: [], corequisites: [], status: 'available', isCritical: true },
  ],
};

function dashboardProps(overrides = {}) {
  return {
    user,
    curriculums,
    selectedCourseId: 'cc',
    setSelectedCourseId: vi.fn(),
    mapData,
    mapLoading: false,
    actionLoadingId: '',
    onToggleSubject: vi.fn(),
    onLogout: vi.fn(),
    dashboardError: '',
    settingsForm: { ...user, theme: 'brand' },
    setSettingsForm: vi.fn(),
    onSaveProfile: vi.fn(),
    onImportCurriculum: vi.fn(),
    importForm: { fileData: '', fileName: '', mimeType: '', sourceText: '' },
    setImportForm: vi.fn(),
    importLoading: false,
    importError: '',
    importSuccess: '',
    settingsLoading: false,
    settingsError: '',
    settingsSuccess: '',
    setTheme: vi.fn(),
    hasSettingsChanges: false,
    ...overrides,
  };
}

describe('layout', () => {
  afterEach(() => {
    cleanup();
  });

  it('Sidebar renderiza usuario, navegacao e logout', () => {
    const onLogout = vi.fn();
    render(
      <Sidebar
        user={user}
        currentPage="overview"
        onNavigate={vi.fn()}
        selectedCatalogKey="cc"
        onSelectCatalogKey={vi.fn()}
        selectedCourseId="cc"
        onSelectCourseId={vi.fn()}
        curriculumGroups={[{ key: 'cc', code: 'CC', name: 'Computacao', versions: [curriculums[0]] }]}
        mapData={mapData}
        onLogout={onLogout}
      />,
    );

    expect(screen.getByText('Lucas Demo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalled();
  });

  it('Dashboard muda de curso ao selecionar outro catalogo', async () => {
    const setSelectedCourseId = vi.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard {...dashboardProps({ setSelectedCourseId })} />
      </MemoryRouter>,
    );

    const [catalogSelect] = screen.getAllByRole('combobox');
    fireEvent.change(catalogSelect, { target: { value: 'si' } });

    await waitFor(() => {
      expect(setSelectedCourseId).toHaveBeenCalledWith('si');
    });
  });

  it('Dashboard mostra estado de carregamento e erros', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard {...dashboardProps({ mapLoading: true, dashboardError: 'Falha ao carregar' })} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Falha ao carregar')).toBeTruthy();
    expect(screen.getByText(/Carregando painel/i)).toBeTruthy();
  });
});
