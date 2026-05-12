import {
  formatRegistration,
  getCurriculumCatalogName,
  getCurriculumVersionLabel,
  pageLabels,
} from '../app/app-utils.js';
import Avatar from '../components/common/Avatar.jsx';

const getTrailFamily = (trail) => String(trail || 'Base').split(/\s*-\s*/)[0].trim() || 'Base';

const getUniqueTrailFamilies = (subjects = [], trailLabels = []) => {
  const values = [
    ...trailLabels.map(getTrailFamily),
    ...subjects.map((subject) => getTrailFamily(subject.trail)),
  ];

  return [...new Set(values.filter(Boolean))];
};

export default function Sidebar({
  user,
  currentPage,
  onNavigate,
  selectedCatalogKey,
  onSelectCatalogKey,
  selectedCourseId,
  onSelectCourseId,
  curriculumGroups,
  mapData,
  onLogout,
}) {
  const activeCourseId = selectedCourseId;
  const activeCatalogKey = selectedCatalogKey;
  const selectedGroup = curriculumGroups.find((group) => group.versions.some((curriculum) => curriculum.id === activeCourseId))
    || curriculumGroups.find((group) => group.key === activeCatalogKey)
    || curriculumGroups[0]
    || null;
  const trailFamilies = getUniqueTrailFamilies(mapData?.subjects, mapData?.course?.trailLabels);

  return (
    <aside className="sidebar">
      <div className="sidebar-block">
        <div className="brand-mark">CM</div>
        <div><p className="sidebar-label">Painel acadêmico</p><h2>CourseMapper</h2></div>
      </div>
      <div className="sidebar-block">
        <p className="sidebar-label">Navegação</p>
        <div className="nav-list">
          {Object.entries(pageLabels).map(([page, label]) => (
            <button
              key={page}
              type="button"
              className={`nav-button ${currentPage === page ? 'is-active' : ''}`}
              onClick={() => onNavigate(page)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar-block">
        <p className="sidebar-label">Curso</p>
        <div className="sidebar-select-wrap">
          <select className="sidebar-select" value={selectedGroup?.key || activeCatalogKey} onChange={(event) => onSelectCatalogKey(event.target.value)}>
            {curriculumGroups.map((group) => (
              <option key={group.key} value={group.key}>
                {group.code ? `${group.code} • ${group.name}` : group.name}
              </option>
            ))}
          </select>
        </div>
        <p className="sidebar-label">Versao da grade</p>
        <div className="sidebar-select-wrap">
          <select className="sidebar-select" value={activeCourseId} onChange={(event) => onSelectCourseId(event.target.value)}>
            {(selectedGroup?.versions || []).map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {getCurriculumVersionLabel(curriculum)}
              </option>
            ))}
          </select>
        </div>
        <div className="sidebar-course-note">
          <strong>{selectedGroup?.code || mapData?.course?.baseCode || mapData?.course?.code || '--'}</strong>
          <span>{selectedGroup ? getCurriculumCatalogName(selectedGroup.versions[0]) : mapData?.course?.name}</span>
        </div>
        <div className="tag-list compact">
          {trailFamilies.map((trail) => <span key={trail}>{trail}</span>)}
        </div>
      </div>
      <div className="sidebar-user">
        <div className="sidebar-user-main">
          <Avatar user={user} />
          <div>
            <strong>{user.name}</strong>
            <p>@{user.username || 'usuario'}</p>
            <p>{formatRegistration(user.registration)}</p>
          </div>
        </div>
        <button type="button" className="ghost-button dark" onClick={onLogout}>Sair</button>
      </div>
    </aside>
  );
}
