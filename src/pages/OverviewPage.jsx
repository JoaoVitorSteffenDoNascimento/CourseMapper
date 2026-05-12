import {
  getCriticalSubjects,
  getNextSubjects,
  statusLabels,
} from '../app/app-utils.js';

export default function OverviewPage({ mapData, user, curriculums, onNavigate }) {
  const availableSubjects = getNextSubjects(mapData.subjects);
  const criticalSubjects = getCriticalSubjects(mapData.subjects).slice(0, 4);
  const userCourse = curriculums.find((item) => item.id === user.courseId);
  return (
    <div className="page-grid">
      <section className="hero-card">
        <div className="hero-content">
          <p className="section-kicker">Visão geral</p>
          <h1>Bom ver você por aqui, {user.name.split(' ')[0]}.</h1>
          <p>Seu curso padrão é <strong>{userCourse?.name}</strong>. O painel abaixo resume o seu momento acadêmico e mostra o que merece mais atenção agora.</p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => onNavigate('curriculum')}>Ver currículo completo</button>
            <button type="button" className="soft-button" onClick={() => onNavigate('settings')}>Abrir configurações</button>
          </div>
        </div>
      </section>
      <section className="stats-strip">
        <article className="metric-card"><span>Conclusão</span><strong>{mapData.stats.completionRate}%</strong></article>
        <article className="metric-card"><span>Concluídas</span><strong>{mapData.stats.completedCount}</strong></article>
        <article className="metric-card"><span>Disponíveis</span><strong>{mapData.stats.availableCount}</strong></article>
        <article className="metric-card"><span>Semestres restantes</span><strong>{mapData.stats.remainingCriticalSemesters}</strong></article>
      </section>
      <section className="content-grid two-columns">
        <article className="surface-card">
          <div className="card-heading"><div><p className="section-kicker">Próximos passos</p><h3>Disciplinas prontas para cursar</h3></div></div>
          <div className="stack-list">
            {availableSubjects.map((subject) => (
              <div key={subject.id} className="list-row">
                <div><strong>{subject.name}</strong><p>{subject.id} • {subject.trail}</p></div>
                <span className="status-pill available">Disponível</span>
              </div>
            ))}
            {availableSubjects.length === 0 ? <p className="empty-copy">Nenhuma disciplina liberada agora.</p> : null}
          </div>
        </article>
        <article className="surface-card">
          <div className="card-heading"><div><p className="section-kicker">Caminho crítico</p><h3>Matérias que puxam o plano</h3></div></div>
          <div className="stack-list">
            {criticalSubjects.map((subject) => (
              <div key={subject.id} className="list-row">
                <div><strong>{subject.name}</strong><p>{subject.id} • {statusLabels[subject.status]}</p></div>
                <span className="critical-chip">Crítico</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
