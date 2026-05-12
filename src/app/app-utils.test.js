import { describe, expect, it } from 'vitest';

import {
  buildBoardModel,
  buildOptimisticMapData,
  canOptimisticallyToggleSubject,
  formatRegistration,
  getFirstCurriculumIdForCatalog,
  getInitials,
  getTrailSummary,
  groupBySemester,
  groupCurriculumsByCatalog,
  normalizeRegistration,
  resolveCurriculumId,
  validateAuthForm,
  validateSettingsForm,
} from './app-utils.js';

const curriculums = [
  { id: 'cc-2024', code: 'CC', baseCode: 'CC', name: 'Computacao 2024', catalogName: 'Computacao', catalogKey: 'cc', academicYear: 2024 },
  { id: 'cc-2026', code: 'CC', baseCode: 'CC', name: 'Computacao 2026', catalogName: 'Computacao', catalogKey: 'cc', academicYear: 2026 },
  { id: 'si-2025', code: 'SI', baseCode: 'SI', name: 'Sistemas', catalogName: 'Sistemas', catalogKey: 'si', academicYear: 2025 },
];

const mapData = {
  course: { id: 'cc-2026', trailLabels: ['Base', 'Dev'] },
  stats: { totalSubjects: 3, completedCount: 1, availableCount: 1, lockedCount: 1, completionRate: 33, remainingCriticalSemesters: 2 },
  subjects: [
    { id: 'A', name: 'A', semester: 1, trail: 'Base', prerequisites: [], corequisites: [], status: 'completed', isCritical: true },
    { id: 'B', name: 'B', semester: 2, trail: 'Dev', prerequisites: ['A'], corequisites: [], status: 'available', isCritical: true },
    { id: 'C', name: 'C', semester: 3, trail: 'Dev', prerequisites: ['B'], corequisites: [], status: 'locked', isCritical: false },
  ],
};

describe('app-utils', () => {
  it('normaliza, formata e valida dados de autenticacao', () => {
    expect(normalizeRegistration('2026 000001')).toBe('2026000001');
    expect(formatRegistration('2026000001')).toBe('2026 000001');
    expect(validateAuthForm('login', { registration: '2026000001', password: '1234' })).toBe('');
    expect(validateAuthForm('login', { registration: '1', password: '1234' })).toMatch(/10/);
  });

  it('valida formulario de configuracoes', () => {
    expect(validateSettingsForm({
      name: 'Lucas Demo',
      username: 'lucas',
      email: 'lucas@example.com',
      theme: 'brand',
    })).toBe('');
    expect(validateSettingsForm({
      name: 'Lu',
      username: 'lu',
      email: 'bad',
      theme: 'unknown',
    })).toMatch(/nome/i);
  });

  it('agrupa curriculos por catalogo e resolve a versao preferencial', () => {
    const groups = groupCurriculumsByCatalog(curriculums);

    expect(groups).toHaveLength(2);
    expect(groups[0].versions.map((item) => item.id)).toEqual(['cc-2026', 'cc-2024']);
    expect(getFirstCurriculumIdForCatalog(curriculums, 'cc')).toBe('cc-2026');
    expect(resolveCurriculumId(curriculums, 'si')).toBe('si-2025');
  });

  it('resume disciplinas por semestre e trilha', () => {
    expect(Object.keys(groupBySemester(mapData.subjects))).toEqual(['1', '2', '3']);
    expect(getTrailSummary(mapData.subjects)).toEqual([
      { trail: 'Base', total: 1, completed: 1, completionRate: 100 },
      { trail: 'Dev', total: 2, completed: 0, completionRate: 0 },
    ]);
  });

  it('atualiza o mapa otimista e protege dependencias', () => {
    const completed = buildOptimisticMapData(mapData, 'B', true);

    expect(completed.subjects.find((subject) => subject.id === 'C')?.status).toBe('available');
    expect(completed.stats.completedCount).toBe(2);
    expect(canOptimisticallyToggleSubject(mapData, mapData.subjects[1])).toEqual({ allowed: true });
    expect(canOptimisticallyToggleSubject(completed, completed.subjects[0])).toMatchObject({ allowed: false });
  });

  it('monta o modelo do quadro com arestas e iniciais', () => {
    const boardModel = buildBoardModel(mapData);

    expect(boardModel.semesters).toEqual([1, 2, 3]);
    expect(boardModel.edges.map((edge) => edge.id)).toContain('A-B');
    expect(getInitials('Lucas Demo')).toBe('LD');
    expect(getInitials('')).toBe('CM');
  });
});
