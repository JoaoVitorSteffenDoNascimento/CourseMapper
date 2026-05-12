const crypto = require('crypto');

function registerAuthRoutes(app, {
  clearFailedLoginAttempts,
  getAuthenticatedUser,
  getLoginThrottleState,
  getTokenFromRequest,
  hashPassword,
  normalizeEmail,
  registerFailedLoginAttempt,
  sanitizeUser,
  userRepository,
  validateRegistrationInput,
  verifyPassword,
}) {
  app.post('/api/auth/register', async (req, res) => {
    const validationError = await validateRegistrationInput(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { name, registration, email, password, courseId } = req.body;
    const normalizedRegistration = String(registration).trim();
    const normalizedEmail = normalizeEmail(email);

    const existingRegistration = await userRepository.findByRegistration(normalizedRegistration);
    if (existingRegistration) {
      return res.status(409).json({ error: 'Matricula ja cadastrada.' });
    }

    const existingEmail = await userRepository.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'E-mail ja cadastrado.' });
    }

    const user = {
      id: crypto.randomUUID(),
      name: String(name).trim(),
      username: String(name).trim().split(/\s+/)[0].toLowerCase(),
      registration: normalizedRegistration,
      email: normalizedEmail,
      courseId,
      avatarUrl: '',
      passwordHash: hashPassword(String(password)),
      sessionToken: crypto.randomUUID(),
      preferences: {
        theme: 'brand',
      },
      progress: {
        [courseId]: [],
      },
    };

    await userRepository.create(user);

    return res.status(201).json({
      token: user.sessionToken,
      user: sanitizeUser(user),
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { registration, password } = req.body;

    if (!registration || !password) {
      return res.status(400).json({ error: 'Informe matricula e senha.' });
    }

    const normalizedRegistration = String(registration).trim();
    const now = Date.now();
    const throttleState = getLoginThrottleState(req, normalizedRegistration, now);

    if (throttleState.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((throttleState.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
    }

    const user = await userRepository.findByRegistration(normalizedRegistration);

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      registerFailedLoginAttempt(req, normalizedRegistration);
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    clearFailedLoginAttempts(req, normalizedRegistration);

    const sessionToken = crypto.randomUUID();
    const updatedUser = await userRepository.updateById(user.id, {
      ...user,
      sessionToken,
    });

    return res.json({
      token: updatedUser.sessionToken,
      user: sanitizeUser(updatedUser),
    });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(204).send();
    }

    await userRepository.updateByToken(token, (user) => ({
      ...user,
      sessionToken: '',
    }));

    return res.status(204).send();
  });

  app.get('/api/auth/me', async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Sessao invalida.' });
    }

    return res.json({ user: sanitizeUser(user) });
  });
}

module.exports = {
  registerAuthRoutes,
};
