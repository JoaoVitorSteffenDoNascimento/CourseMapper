import { formatRegistration } from '../app/app-utils.js';
import Avatar from '../components/common/Avatar.jsx';
import ThemeControl from '../components/common/ThemeControl.jsx';

export default function SettingsPage({
  user,
  curriculums,
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
  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file);
    });
    setSettingsForm((current) => ({ ...current, avatarUrl: dataUrl }));
  }

  async function handleCurriculumFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const normalizedFileName = String(file.name || '').toLowerCase();
    const isBinaryGrade = normalizedFileName.endsWith('.pdf') || normalizedFileName.endsWith('.docx');

    if (isBinaryGrade) {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo da grade.'));
        reader.readAsDataURL(file);
      });

      setImportForm((current) => ({
        ...current,
        fileData,
        fileName: file.name,
        mimeType: file.type || '',
        sourceText: '',
      }));

      return;
    }

    const sourceText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo da grade.'));
      reader.readAsText(file, 'utf-8');
    });

    setImportForm((current) => ({
      ...current,
      fileData: '',
      fileName: file.name,
      mimeType: file.type || '',
      sourceText,
    }));
  }

  return (
    <div className="page-grid">
      <section className="page-header-card">
        <p className="section-kicker">Configurações</p>
        <h1>Seu perfil e preferências</h1>
        <p>Atualize sua foto, nome de usuário, dados da conta e o tema do site em um único lugar.</p>
      </section>
      <section className="content-grid two-columns settings-layout">
        <article className="surface-card">
          <div className="card-heading"><div><p className="section-kicker">Foto de perfil</p><h3>Identidade visual</h3></div></div>
          <div className="settings-avatar-block">
            <Avatar user={{ name: settingsForm.name || user.name, avatarUrl: settingsForm.avatarUrl }} large />
            <div className="settings-avatar-copy">
              <strong>Imagem do usuário</strong>
              <p>Envie uma imagem do seu dispositivo para personalizar o painel com mais estabilidade.</p>
              <div className="settings-avatar-actions">
                <label className="upload-button">Escolher imagem<input type="file" accept="image/*" onChange={handleAvatarChange} /></label>
                <button
                  type="button"
                  className="soft-button"
                  onClick={() => setSettingsForm((current) => ({ ...current, avatarUrl: '' }))}
                  disabled={!settingsForm.avatarUrl}
                >
                  Remover foto
                </button>
              </div>
            </div>
          </div>
        </article>
        <article className="surface-card">
          <div className="card-heading"><div><p className="section-kicker">Tema</p><h3>Aparência do site</h3></div></div>
          <ThemeControl
            theme={settingsForm.theme}
            setTheme={(nextTheme) => {
              setSettingsForm((current) => ({ ...current, theme: nextTheme }));
              setTheme(nextTheme);
            }}
          />
        </article>
      </section>
      <section className="surface-card">
        <div className="card-heading"><div><p className="section-kicker">Dados pessoais</p><h3>Editar perfil</h3></div></div>
        <form className="settings-form" onSubmit={onSaveProfile}>
          <label>Nome completo<input value={settingsForm.name} onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label>Nome de usuário<input value={settingsForm.username} onChange={(event) => setSettingsForm((current) => ({ ...current, username: event.target.value.replace(/\s+/g, '') }))} /></label>
          <label>E-mail<input type="email" value={settingsForm.email} onChange={(event) => setSettingsForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Matrícula<input value={formatRegistration(user.registration)} disabled /></label>
          {settingsError ? <p className="form-error">{settingsError}</p> : null}
          {settingsSuccess ? <p className="form-success">{settingsSuccess}</p> : null}
          <div className="settings-actions"><button type="submit" className="primary-button" disabled={settingsLoading || !hasSettingsChanges}>{settingsLoading ? 'Salvando...' : 'Salvar configurações'}</button></div>
        </form>
      </section>
      <section className="surface-card">
        <div className="card-heading"><div><p className="section-kicker">Grade curricular</p><h3>Importar nova grade</h3></div></div>
        <form className="settings-form" onSubmit={onImportCurriculum}>
          <label>Nome do arquivo
            <input
              value={importForm.fileName}
              onChange={(event) => setImportForm((current) => ({ ...current, fileName: event.target.value }))}
              placeholder="grade-curricular.txt"
            />
          </label>
          <label>Arquivo da grade
            <span className="upload-button">Selecionar arquivo<input type="file" accept=".txt,.csv,.json,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleCurriculumFileChange} /></span>
          </label>
          <label className="settings-textarea-field">Conteudo da grade
            <textarea
              value={importForm.sourceText}
              onChange={(event) => setImportForm((current) => ({ ...current, sourceText: event.target.value }))}
              placeholder="Cole aqui a grade curricular em texto, CSV ou JSON. Para PDF e DOCX, a Mistral le a grade e estrutura pre e correquisitos no backend."
              rows={10}
            />
          </label>
          {importError ? <p className="form-error">{importError}</p> : null}
          {importSuccess ? <p className="form-success">{importSuccess}</p> : null}
          <div className="settings-actions"><button type="submit" className="primary-button" disabled={importLoading || !(importForm.sourceText.trim() || importForm.fileData)}>{importLoading ? 'Importando...' : 'Importar grade'}</button></div>
        </form>
      </section>
      <section className="surface-card">
        <div className="card-heading"><div><p className="section-kicker">Gerenciar currículos</p><h3>Deletar grades</h3></div></div>
        {curriculums && curriculums.length > 0 ? (
          <div className="curriculums-list">
            <p className="section-kicker">Currículos da sua conta ({curriculums.length})</p>
            <div className="curriculum-items">
              {curriculums.map((curriculum) => (
                <div key={curriculum.id} className="curriculum-item">
                  <div className="curriculum-info">
                    <strong>{curriculum.code || curriculum.name || curriculum.id}</strong>
                    <p>{curriculum.name}</p>
                  </div>
                  <button
                    type="button"
                    className="soft-button"
                    onClick={() => onDeleteCurriculum(curriculum.id)}
                  >
                    Deletar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="section-kicker">Nenhum currículo encontrado.</p>
        )}
      </section>
    </div>
  );
}
