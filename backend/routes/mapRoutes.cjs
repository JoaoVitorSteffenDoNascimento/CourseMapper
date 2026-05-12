function registerMapRoutes(app, {
  buildMapPayload,
  getAuthenticatedUser,
}) {
  app.get('/api/map', async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }

    return res.json(await buildMapPayload(user, req.query.courseId));
  });
}

module.exports = {
  registerMapRoutes,
};
