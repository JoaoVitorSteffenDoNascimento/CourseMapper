function registerCurriculumRoutes(app, {
  buildCurriculumSummary,
  config,
  curriculumRepository,
  getAuthenticatedUser,
  parseCurriculumSource,
  securityLimits,
}) {
  app.get('/api/curriculums', (req, res) => {
    buildCurriculumSummary()
      .then((summary) => {
        res.json(summary);
      })
      .catch((error) => {
        res.status(500).json({ error: error.message || 'Falha ao carregar curriculos.' });
      });
  });

  app.post('/api/curriculums/import', async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }

    const sourceText = String(req.body.sourceText || '');
    const fileName = String(req.body.fileName || '').trim();
    const fileData = String(req.body.fileData || '').trim();
    const mimeType = String(req.body.mimeType || '').trim();

    if (!sourceText.trim() && !fileData) {
      return res.status(400).json({ error: 'Envie o conteudo ou o arquivo da grade curricular.' });
    }

    if (sourceText.length > securityLimits.maxImportTextLength || fileData.length > securityLimits.maxImportFileDataLength) {
      return res.status(413).json({ error: 'Arquivo ou conteudo muito grande para importacao.' });
    }

    try {
      const curriculum = await parseCurriculumSource({
        fileData,
        fileName,
        mimeType,
        mistralApiKey: config.mistralApiKey,
        mistralModel: config.mistralModel,
        mistralOcrModel: config.mistralOcrModel,
        sourceText,
      });

      await curriculumRepository.upsert(curriculum);
      const summary = await buildCurriculumSummary();

      return res.status(201).json({
        curriculum,
        curriculums: summary,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Falha ao importar a grade curricular.' });
    }
  });
}

module.exports = {
  registerCurriculumRoutes,
};
