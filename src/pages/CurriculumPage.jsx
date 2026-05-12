import { groupBySemester, statusLabels } from '../app/app-utils.js';

export default function CurriculumPage({ mapData, actionLoadingId, onToggleSubject }) {
  const groupedSubjects = groupBySemester(mapData.subjects);
  const orderedSemesters = Object.keys(groupedSubjects).sort((a, b) => Number(a) - Number(b));
  return (
    <div className="page-grid">
      <section className="page-header-card">
        <p className="section-kicker">Currículo</p>
        <h1>{mapData.course.name}</h1>
        <p>Uma leitura limpa por semestre, com estados visuais discretos e destaque para o que está mais perto de destravar o curso.</p>
      </section>
      <section className="semester-grid refined">
        {orderedSemesters.map((semester) => (
          <article key={semester} className="surface-card semester-surface">
            <div className="card-heading">
              <div><p className="section-kicker">Semestre</p><h3>{semester}º período</h3></div>
              <span className="small-counter">{groupedSubjects[semester].length} matérias</span>
            </div>
            <div className="subject-list">
              {groupedSubjects[semester].map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  className={`subject-card status-${subject.status} ${subject.isCritical ? 'is-critical' : ''}`}
                  onClick={() => onToggleSubject(subject)}
                  disabled={actionLoadingId === subject.id || subject.status === 'locked'}
                >
                  <div className="subject-topline"><strong>{subject.id}</strong><span>{statusLabels[subject.status]}</span></div>
                  <h4>{subject.name}</h4>
                  <p className="subject-meta">Trilha: <strong>{subject.trail}</strong></p>
                  <p className="subject-meta">Pre-requisitos: <strong>{subject.prerequisites.length > 0 ? subject.prerequisites.join(', ') : 'Nenhum'}</strong></p>
                  <p className="subject-meta">Correquisitos: <strong>{subject.corequisites.length > 0 ? subject.corequisites.join(', ') : 'Nenhum'}</strong></p>
                  <div className="subject-footer">
                    {subject.isCritical ? <span className="critical-chip">Caminho crítico</span> : <span className="muted-chip">Fluxo normal</span>}
                    <span className="action-hint">{actionLoadingId === subject.id ? 'Salvando...' : subject.status === 'completed' ? 'Clique para desfazer' : subject.status === 'available' ? 'Clique para concluir' : 'Bloqueada'}</span>
                  </div>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
