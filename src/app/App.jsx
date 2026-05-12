import { useEffect, useState } from 'react';
import './App.css';
import {
  buildOptimisticMapData,
  canOptimisticallyToggleSubject,
  getInitialForm,
  getSettingsForm,
  normalizeRegistration,
  normalizeSettingsForCompare,
  resolveCurriculumId,
  validateAuthForm,
  validateSettingsForm,
} from './app-utils.js';
import AuthScreen from '../features/auth/AuthScreen.jsx';
import Dashboard from '../layout/Dashboard.jsx';
import { apiRequest } from '../services/api.js';
import { getStoredTheme, getStoredToken, setStoredTheme, setStoredToken } from '../services/storage.js';

export default function App() {
  const [token, setToken] = useState(getStoredToken);
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState(getInitialForm);
  const [curriculums, setCurriculums] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('cc');
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(getStoredTheme);
  const [settingsForm, setSettingsForm] = useState(getSettingsForm(null, getStoredTheme()));
  const [importForm, setImportForm] = useState({ fileData: '', fileName: '', mimeType: '', sourceText: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [authError, setAuthError] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const persistedTheme = user?.preferences?.theme || getStoredTheme();
  const hasSettingsChanges = JSON.stringify(normalizeSettingsForCompare(settingsForm)) !== JSON.stringify(normalizeSettingsForCompare(getSettingsForm(user, persistedTheme)));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    async function loadCurriculums() {
      try {
        const response = await apiRequest('/curriculums');
        setCurriculums(response);
      } catch (error) {
        setAuthError(error.message);
      }
    }

    loadCurriculums();
  }, []);

  useEffect(() => {
    async function bootstrapSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest('/auth/me', {}, token);
        setUser(response.user);
        setSelectedCourseId(response.user.courseId);
        const nextTheme = response.user.preferences?.theme || getStoredTheme();
        setTheme(nextTheme);
        setSettingsForm(getSettingsForm(response.user, nextTheme));
      } catch {
        setStoredToken('');
        setToken('');
      } finally {
        setLoading(false);
      }
    }

    bootstrapSession();
  }, [token]);

  useEffect(() => {
    if (curriculums.length === 0) {
      return;
    }

    const nextCourseId = resolveCurriculumId(curriculums, selectedCourseId || user?.courseId || '');

    if (nextCourseId && nextCourseId !== selectedCourseId) {
      setSelectedCourseId(nextCourseId);
    }
  }, [curriculums, selectedCourseId, user]);

  useEffect(() => {
    async function loadMap() {
      if (!token || !user || !selectedCourseId) {
        return;
      }

      setMapLoading(true);
      setDashboardError('');

      try {
        const response = await apiRequest(`/map?courseId=${selectedCourseId}`, {}, token);
        setMapData(response);
      } catch (error) {
        setDashboardError(error.message);
      } finally {
        setMapLoading(false);
      }
    }

    loadMap();
  }, [selectedCourseId, token, user]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const validationError = validateAuthForm(authMode, form);
      if (validationError) throw new Error(validationError);

      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login'
        ? { registration: normalizeRegistration(form.registration), password: form.password }
        : {
            ...form,
            registration: normalizeRegistration(form.registration),
            email: form.email.trim().toLowerCase(),
            name: form.name.trim(),
          };
      const response = await apiRequest(path, { method: 'POST', body: JSON.stringify(payload) });

      const nextTheme = response.user.preferences?.theme || 'brand';
      setStoredToken(response.token);
      setToken(response.token);
      setUser(response.user);
      setTheme(nextTheme);
      setSettingsForm(getSettingsForm(response.user, nextTheme));
      setSelectedCourseId(response.user.courseId);
      setForm(getInitialForm());
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, token);
    } catch {
      // logout local mesmo se o backend falhar
    } finally {
      setStoredToken('');
      setToken('');
      setUser(null);
      setMapData(null);
      setSelectedCourseId('cc');
      setAuthMode('login');
      setForm(getInitialForm());
      setSettingsForm(getSettingsForm(null, getStoredTheme()));
      setSettingsError('');
      setSettingsSuccess('');
      setImportForm({ fileData: '', fileName: '', mimeType: '', sourceText: '' });
      setImportError('');
      setImportSuccess('');
    }
  }

  async function handleToggleSubject(subject) {
    if (!token || subject.status === 'locked') return;

    const guard = canOptimisticallyToggleSubject(mapData, subject);
    if (!guard.allowed) {
      setDashboardError(guard.error);
      return;
    }

    const previousMapData = mapData;
    const shouldComplete = subject.status !== 'completed';
    setActionLoadingId(subject.id);
    setDashboardError('');

    if (previousMapData) {
      setMapData(buildOptimisticMapData(previousMapData, subject.id, shouldComplete));
    }

    try {
      const response = await apiRequest('/progress/toggle', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourseId,
          subjectId: subject.id,
          completed: shouldComplete,
        }),
      }, token);
      setMapData(response);
    } catch (error) {
      if (previousMapData) {
        setMapData(previousMapData);
      }
      setDashboardError(error.message);
    } finally {
      setActionLoadingId('');
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSettingsLoading(true);
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const validationError = validateSettingsForm(settingsForm);
      if (validationError) throw new Error(validationError);

      const response = await apiRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: settingsForm.name.trim(),
          username: settingsForm.username.trim(),
          email: settingsForm.email.trim().toLowerCase(),
          avatarUrl: settingsForm.avatarUrl.trim(),
          theme: settingsForm.theme,
        }),
      }, token);

      setUser(response.user);
      setTheme(response.user.preferences?.theme || settingsForm.theme);
      setSettingsForm(getSettingsForm(response.user, response.user.preferences?.theme || settingsForm.theme));
      setSettingsSuccess('Configurações salvas com sucesso.');
    } catch (error) {
      setSettingsError(error.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleImportCurriculum(event) {
    event.preventDefault();
    setImportLoading(true);
    setImportError('');
    setImportSuccess('');

    try {
      const response = await apiRequest('/curriculums/import', {
        method: 'POST',
        body: JSON.stringify({
          fileData: importForm.fileData,
          fileName: importForm.fileName.trim(),
          mimeType: importForm.mimeType,
          sourceText: importForm.sourceText,
        }),
      }, token);

      setCurriculums(response.curriculums);
      setSelectedCourseId(response.curriculum.id);
      setImportForm({ fileData: '', fileName: '', mimeType: '', sourceText: '' });
      setImportSuccess(`Grade "${response.curriculum.name}" importada com sucesso.`);
    } catch (error) {
      setImportError(error.message);
    } finally {
      setImportLoading(false);
    }
  }

  if (loading) {
    return <div className="screen-message">Preparando sua área acadêmica...</div>;
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        form={form}
        setForm={setForm}
        onSubmit={handleAuthSubmit}
        setAuthMode={setAuthMode}
        loading={authLoading}
        error={authError}
        curriculums={curriculums}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      curriculums={curriculums}
      selectedCourseId={selectedCourseId}
      setSelectedCourseId={setSelectedCourseId}
      mapData={mapData}
      mapLoading={mapLoading}
      actionLoadingId={actionLoadingId}
      onToggleSubject={handleToggleSubject}
      onLogout={handleLogout}
      dashboardError={dashboardError}
      settingsForm={settingsForm}
      setSettingsForm={setSettingsForm}
      onSaveProfile={handleSaveProfile}
      onImportCurriculum={handleImportCurriculum}
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
  );
}
