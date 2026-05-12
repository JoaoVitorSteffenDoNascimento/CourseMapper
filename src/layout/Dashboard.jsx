import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  getFirstCurriculumIdForCatalog,
  groupCurriculumsByCatalog,
  pageLabels,
} from '../app/app-utils.js';
import Sidebar from './Sidebar.jsx';
import OverviewPage from '../pages/OverviewPage.jsx';
import CurriculumPage from '../pages/CurriculumPage.jsx';
import AnalyticsPage from '../pages/AnalyticsPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';

const loadBoardPage = () => import('../pages/BoardPage.jsx');
const BoardPage = lazy(loadBoardPage);

export default function Dashboard({
  user,
  curriculums,
  selectedCourseId,
  setSelectedCourseId,
  mapData,
  mapLoading,
  actionLoadingId,
  onToggleSubject,
  onLogout,
  dashboardError,
  settingsForm,
  setSettingsForm,
  onSaveProfile,
  onImportCurriculum,
  onDeleteCurriculum,
  importForm,
  setImportForm,
  importLoading,
  importError,
  importSuccess,
  settingsLoading,
  settingsError,
  settingsSuccess,
  setTheme,
  hasSettingsChanges,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeKey = location.pathname.replace(/^\//, '') || 'overview';
  const currentPage = pageLabels[routeKey] ? routeKey : 'overview';
  const curriculumGroups = groupCurriculumsByCatalog(curriculums);
  const selectedCurriculum = curriculums.find((item) => item.id === selectedCourseId) || curriculumGroups[0]?.versions?.[0] || null;
  const selectedCatalogKey = selectedCurriculum?.catalogKey || curriculumGroups[0]?.key || '';

  function handleNavigate(page) {
    const nextPath = page === 'overview' ? '/' : `/${page}`;
    navigate(nextPath);
  }

  function handleSelectCatalogKey(nextCatalogKey) {
    const nextCourseId = getFirstCurriculumIdForCatalog(curriculums, nextCatalogKey);

    if (!nextCourseId) {
      return;
    }

    setSelectedCourseId(nextCourseId);
  }

  function handleSelectCourseId(nextCourseId) {
    if (!nextCourseId || nextCourseId === selectedCourseId) {
      return;
    }

    setSelectedCourseId(nextCourseId);
  }

  useEffect(() => {
    document.title = currentPage === 'overview'
      ? 'CourseMapper'
      : `${pageLabels[currentPage]} | CourseMapper`;
  }, [currentPage]);

  return (
    <div className="dashboard-shell">
      <Sidebar
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        selectedCatalogKey={selectedCatalogKey}
        onSelectCatalogKey={handleSelectCatalogKey}
        selectedCourseId={selectedCourseId}
        onSelectCourseId={handleSelectCourseId}
        curriculumGroups={curriculumGroups}
        mapData={mapData}
        onLogout={onLogout}
      />
      <main className="dashboard-main">
        <header className="main-header">
          <div><p className="section-kicker">Workspace</p><h1>{pageLabels[currentPage]}</h1></div>
          <div className="header-meta">
            <span>{mapData?.course.baseCode || mapData?.course.code || '--'}</span>
            <span>{mapData?.course.versionLabel || 'Grade padrao'}</span>
            <span>{mapData?.stats.completionRate ?? 0}% concluído</span>
          </div>
        </header>
        {dashboardError ? <p className="banner-error">{dashboardError}</p> : null}
        {mapLoading ? <p className="loading-copy">Carregando painel...</p> : (
          <Routes>
            <Route path="/" element={mapData ? <OverviewPage mapData={mapData} user={user} curriculums={curriculums} onNavigate={handleNavigate} /> : null} />
            <Route path="/curriculum" element={mapData ? <CurriculumPage mapData={mapData} actionLoadingId={actionLoadingId} onToggleSubject={onToggleSubject} /> : null} />
            <Route
              path="/board"
              element={mapData ? (
                <Suspense fallback={<p className="loading-copy">Preparando quadro de cadeiras...</p>}>
                  <BoardPage mapData={mapData} actionLoadingId={actionLoadingId} onToggleSubject={onToggleSubject} />
                </Suspense>
              ) : null}
            />
            <Route path="/analytics" element={mapData ? <AnalyticsPage mapData={mapData} /> : null} />
            <Route
              path="/settings"
              element={mapData ? (
                <SettingsPage
                  user={user}
                  curriculums={curriculums}
                  settingsForm={settingsForm}
                  setSettingsForm={setSettingsForm}
                  onSaveProfile={onSaveProfile}
                  onImportCurriculum={onImportCurriculum}
                  onDeleteCurriculum={onDeleteCurriculum}
                  importForm={importForm}
                  setImportForm={setImportForm}
                  importLoading={importLoading}
                  importError={importError}
                  importSuccess={importSuccess}
                  settingsLoading={settingsLoading}
                  settingsError={settingsError}
                  settingsSuccess={settingsSuccess}
                  setTheme={setTheme}
                  hasSettingsChanges={hasSettingsChanges}
                />
              ) : null}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
