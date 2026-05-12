function registerProfileRoutes(app, {
  getAuthenticatedUser,
  sanitizeUser,
  userRepository,
  validateProfileUpdate,
}) {
  app.patch('/api/profile', async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }

    const validationError = await validateProfileUpdate(user, req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const updatedUser = await userRepository.updateById(user.id, {
      ...user,
      name: String(req.body.name).trim(),
      username: String(req.body.username).trim(),
      email: String(req.body.email).trim().toLowerCase(),
      courseId: user.courseId,
      avatarUrl: String(req.body.avatarUrl || '').trim(),
      preferences: {
        ...user.preferences,
        theme: String(req.body.theme || 'brand').trim(),
      },
    });

    return res.json({ user: sanitizeUser(updatedUser) });
  });
}

module.exports = {
  registerProfileRoutes,
};
