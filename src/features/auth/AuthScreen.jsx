import { formatRegistration, groupCurriculumsByCatalog } from '../../app/app-utils.js';

export default function AuthScreen({ authMode, form, setForm, onSubmit, setAuthMode, loading, error, curriculums }) {
  const curriculumGroups = groupCurriculumsByCatalog(curriculums);

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-badge">DACathon 2026</div>
        <h1>CourseMapper</h1>
        <p className="auth-copy">Um painel acadêmico mais calmo, visual e objetivo para acompanhar disciplinas, trilhas, progresso e o caminho crítico do curso.</p>
        <div className="auth-panels">
          <article><span className="panel-kicker">Organização</span><strong>Visão clara por semestre</strong><p>Menos ruído visual e mais foco no que desbloqueia sua próxima etapa.</p></article>
          <article><span className="panel-kicker">Planejamento</span><strong>Análises de progresso</strong><p>Percentual concluído, matérias liberadas e leitura do caminho crítico.</p></article>
          <article><span className="panel-kicker">Perfil</span><strong>Configurações pessoais</strong><p>Depois do login você consegue editar foto, dados do perfil e tema do site.</p></article>
        </div>
      </section>
      <section className="auth-card">
        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === 'register' ? (
            <label>Nome completo
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Lucas Oliveira" />
            </label>
          ) : null}
          <label>Matrícula
            <input value={form.registration} onChange={(event) => setForm((current) => ({ ...current, registration: formatRegistration(event.target.value) }))} placeholder="2026 000001" inputMode="numeric" maxLength={11} />
          </label>
          {authMode === 'register' ? (
            <label>E-mail
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="lucas@faculdade.edu.br" autoComplete="email" />
            </label>
          ) : null}
          <label>Senha
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Mínimo de 8 caracteres" minLength={4} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {authMode === 'register' ? (
            <label>Curso
              <select value={form.courseId} onChange={(event) => setForm((current) => ({ ...current, courseId: event.target.value }))}>
                {curriculumGroups.map((group) => (
                  <option key={group.key} value={group.versions[0]?.id || ''}>
                    {group.code ? `${group.code} • ${group.name}` : group.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="auth-actions">
            <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Processando...' : authMode === 'login' ? 'Entrar' : 'Cadastrar-se'}</button>
            <button type="button" className="soft-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} disabled={loading}>
              {authMode === 'login' ? 'Cadastrar-se' : 'Entrar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
