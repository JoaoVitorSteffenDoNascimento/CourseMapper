function registerProgressRoutes(app, {
  buildMapPayload,
  getAuthenticatedUser,
  getCurriculumCatalog,
  toggleSubjectProgress,
  userRepository,
}) {
  app.post('/api/progress/toggle', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    const curriculumCatalog = await getCurriculumCatalog();

    if (!user) {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }

    const progressResult = toggleSubjectProgress(user, req.body, curriculumCatalog);

    if (progressResult.error) {
      return res.status(progressResult.status).json({ error: progressResult.error });
    }

    const updatedUser = await userRepository.updateById(user.id, {
      ...user,
      progress: {
        ...user.progress,
        [progressResult.courseId]: progressResult.progress,
      },
    });

    return res.json(await buildMapPayload(updatedUser, progressResult.courseId));
  });
}

module.exports = {
  registerProgressRoutes,
};
