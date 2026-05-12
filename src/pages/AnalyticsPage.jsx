import { getTrailSummary } from '../app/app-utils.js';

export default function AnalyticsPage({ mapData }) {
  const trailSummary = getTrailSummary(mapData.subjects);
  const completion = mapData.stats.completionRate;
  return (
    <div className="page-grid">
      <section className="page-header-card">
        <p className="section-kicker">Análises</p>
        <h1>Leitura do progresso</h1>
        <p>Um retrato rápido do que já foi concluído, das trilhas mais fortes e do quanto ainda falta para terminar o caminho principal.</p>
      </section>
      <section className="content-grid two-columns">
        <article className="surface-card progress-card">
          <div className="card-heading"><div><p className="section-kicker">Ritmo geral</p><h3>Conclusão do curso</h3></div></div>
          <div className="progress-ring" style={{ '--progress-value': `${completion}%` }}><div className="progress-ring-inner"><strong>{completion}%</strong><span>concluído</span></div></div>
          <p className="support-copy">{mapData.stats.completedCount} de {mapData.stats.totalSubjects} disciplinas concluídas.</p>
        </article>
        <article className="surface-card">
          <div className="card-heading"><div><p className="section-kicker">Estimativa</p><h3>Tempo restante</h3></div></div>
          <div className="timeline-callout"><strong>{mapData.stats.remainingCriticalSemesters}</strong><span>semestres no caminho crítico</span></div>
          <p className="support-copy">Considerando que todas as disciplinas abrem em todos os semestres, este número ajuda a enxergar o mínimo teórico para concluir o fluxo principal.</p>
        </article>
      </section>
      <section className="surface-card">
        <div className="card-heading"><div><p className="section-kicker">Trilhas</p><h3>Distribuição por área</h3></div></div>
        <div className="trail-grid">
          {trailSummary.map((item) => (
            <article key={item.trail} className="trail-card">
              <strong>{item.trail}</strong>
              <span>{item.completed}/{item.total} concluídas</span>
              <div className="mini-bar"><div style={{ width: `${item.completionRate}%` }} /></div>
              <p>{item.completionRate}% de aproveitamento nesta trilha</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
