const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const compression = require('compression');

const defaultConfig = require('./config.cjs');
const { createCurriculumRepository, createUserRepository } = require('./repositories/index.cjs');
const { createCurriculumCatalog, mergeCurriculumSources } = require('./services/curriculumCatalog.cjs');
const { parseCurriculumSource } = require('./services/curriculumImportService.cjs');
const { buildMapPayload: buildMapPayloadFromCatalog } = require('./services/mapService.cjs');
const { toggleSubjectProgress } = require('./services/progressService.cjs');
const { registerAuthRoutes } = require('./routes/authRoutes.cjs');
const { registerCurriculumRoutes } = require('./routes/curriculumRoutes.cjs');
const { registerMapRoutes } = require('./routes/mapRoutes.cjs');
const { registerProfileRoutes } = require('./routes/profileRoutes.cjs');
const { registerProgressRoutes } = require('./routes/progressRoutes.cjs');
const {
  SECURE_THEMES,
  applySecurityHeaders,
  assertSecureRuntimeConfig,
  createCorsOriginValidator,
  getPasswordSecurityMessage,
  hasResolvableEmailDomain,
  hashPassword,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} = require('./security.cjs');

function sanitizeUser(user) {
  const fallbackUsername = String(user.name || '')
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase() || 'usuario';

  return {
    id: user.id,
    name: user.name,
    username: user.username || fallbackUsername,
    registration: user.registration,
    email: user.email,
    courseId: user.courseId,
    avatarUrl: user.avatarUrl || '',
    preferences: {
      theme: user.preferences?.theme || 'brand',
    },
  };
}

const DEFAULT_SECURITY_LIMITS = {
  authMaxFailedAttempts: 5,
  authAttemptWindowMs: 10 * 60 * 1000,
  authLockoutMs: 15 * 60 * 1000,
  maxProfileAvatarDataUriLength: 2 * 1024 * 1024,
  maxImportTextLength: 4 * 1024 * 1024,
  maxImportFileDataLength: 8 * 1024 * 1024,
};

function getPositiveInt(value, fallbackValue) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
}

function getSecurityLimits(config) {
  return {
    authMaxFailedAttempts: getPositiveInt(config.authMaxFailedAttempts, DEFAULT_SECURITY_LIMITS.authMaxFailedAttempts),
    authAttemptWindowMs: getPositiveInt(config.authAttemptWindowMs, DEFAULT_SECURITY_LIMITS.authAttemptWindowMs),
    authLockoutMs: getPositiveInt(config.authLockoutMs, DEFAULT_SECURITY_LIMITS.authLockoutMs),
    maxProfileAvatarDataUriLength: getPositiveInt(config.maxProfileAvatarDataUriLength, DEFAULT_SECURITY_LIMITS.maxProfileAvatarDataUriLength),
    maxImportTextLength: getPositiveInt(config.maxImportTextLength, DEFAULT_SECURITY_LIMITS.maxImportTextLength),
    maxImportFileDataLength: getPositiveInt(config.maxImportFileDataLength, DEFAULT_SECURITY_LIMITS.maxImportFileDataLength),
  };
}

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return '';
  }

  return authorization.slice(7);
}

function createApp({
  curriculumRepository = createCurriculumRepository(),
  userRepository = createUserRepository(),
  config = defaultConfig,
  emailDomainValidator = hasResolvableEmailDomain,
} = {}) {
  assertSecureRuntimeConfig(config);
  const app = express();
  const frontendDistDir = path.resolve(__dirname, '..', 'dist');
  const frontendIndexPath = path.join(frontendDistDir, 'index.html');
  const hasFrontendBuild = fs.existsSync(frontendIndexPath);
  const securityLimits = getSecurityLimits(config);
  const loginAttemptStore = new Map();

  app.disable('x-powered-by');
  app.use((req, res, next) => applySecurityHeaders(req, res, next, { isProduction: config.isProduction }));
  app.use(cors({
    credentials: true,
    origin: createCorsOriginValidator(config),
  }));
  app.use(compression({ threshold: '2kb' }));
  app.use(express.json({ limit: '20mb' }));

  async function getCurriculumCatalog() {
    const importedCurriculums = await curriculumRepository.list();
    return createCurriculumCatalog(mergeCurriculumSources(importedCurriculums));
  }

  async function buildMapPayload(user, selectedCourseId) {
    const curriculumCatalog = await getCurriculumCatalog();
    return buildMapPayloadFromCatalog(user, selectedCourseId, curriculumCatalog);
  }

  async function buildCurriculumSummary() {
    const curriculumCatalog = await getCurriculumCatalog();
    return curriculumCatalog.getSummaryList();
  }

  async function getAuthenticatedUser(req) {
    const token = getTokenFromRequest(req);

    if (!token) {
      return null;
    }

    return userRepository.findByToken(token);
  }

  function getClientSource(req) {
    if (config.trustProxy) {
      const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if (forwardedFor) {
        return forwardedFor;
      }
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  function getLoginAttemptKey(req, registration) {
    const normalizedRegistration = String(registration || '').trim() || 'anon';
    return `${normalizedRegistration}|${getClientSource(req)}`;
  }

  function pruneLoginAttemptStore(now) {
    for (const [entryKey, entryState] of loginAttemptStore.entries()) {
      if (entryState.windowStartedAt + securityLimits.authAttemptWindowMs < now) {
        loginAttemptStore.delete(entryKey);
      }
    }
  }

  function getLoginThrottleState(req, registration, now = Date.now()) {
    const key = getLoginAttemptKey(req, registration);
    const existing = loginAttemptStore.get(key);

    if (!existing) {
      return { key, failedAttempts: 0, blockedUntil: 0, windowStartedAt: now };
    }

    if (existing.windowStartedAt + securityLimits.authAttemptWindowMs < now) {
      loginAttemptStore.delete(key);
      return { key, failedAttempts: 0, blockedUntil: 0, windowStartedAt: now };
    }

    return { key, ...existing };
  }

  function registerFailedLoginAttempt(req, registration) {
    const now = Date.now();
    const { key, failedAttempts, windowStartedAt } = getLoginThrottleState(req, registration, now);
    const updatedAttempts = failedAttempts + 1;

    loginAttemptStore.set(key, {
      failedAttempts: updatedAttempts,
      windowStartedAt,
      blockedUntil: updatedAttempts >= securityLimits.authMaxFailedAttempts
        ? now + securityLimits.authLockoutMs
        : 0,
    });

    if (loginAttemptStore.size > 3000) {
      pruneLoginAttemptStore(now);
    }
  }

  function clearFailedLoginAttempts(req, registration) {
    loginAttemptStore.delete(getLoginAttemptKey(req, registration));
  }

  async function validateRegistrationInput(body) {
    const { name, registration, email, password, courseId } = body;
    const curriculumCatalog = await getCurriculumCatalog();

    if (!name || !registration || !email || !password || !courseId) {
      return 'Preencha todos os campos.';
    }

    if (!curriculumCatalog.getCourse(courseId)) {
      return 'Curso invalido.';
    }

    if (!isValidEmail(email)) {
      return 'Informe um e-mail valido.';
    }

    if (!(await emailDomainValidator(email))) {
      return 'O dominio do e-mail nao pode ser validado.';
    }

    const passwordError = getPasswordSecurityMessage(password);
    if (passwordError) {
      return passwordError;
    }

    return '';
  }

  async function validateProfileUpdate(user, body) {
    const nextName = String(body.name || '').trim();
    const nextUsername = String(body.username || '').trim();
    const nextEmail = String(body.email || '').trim().toLowerCase();
    const nextAvatarUrl = String(body.avatarUrl || '').trim();
    const nextTheme = String(body.theme || '').trim() || 'brand';

    if (nextName.length < 3) {
      return 'Informe um nome valido.';
    }

    if (nextUsername.length < 3) {
      return 'O nome de usuario deve ter pelo menos 3 caracteres.';
    }

    if (!isValidEmail(nextEmail)) {
      return 'Informe um e-mail valido.';
    }

    if (!(await emailDomainValidator(nextEmail))) {
      return 'O dominio do e-mail nao pode ser validado.';
    }

    if (!SECURE_THEMES.has(nextTheme)) {
      return 'Tema invalido.';
    }

    if (nextAvatarUrl && !nextAvatarUrl.startsWith('data:image/')) {
      return 'Use o upload de imagem para definir a foto de perfil.';
    }

    if (nextAvatarUrl.length > securityLimits.maxProfileAvatarDataUriLength) {
      return 'A imagem de perfil e muito grande.';
    }

    const existingEmail = await userRepository.findByEmail(nextEmail);
    if (existingEmail && existingEmail.id !== user.id) {
      return 'E-mail ja cadastrado.';
    }

    return '';
  }

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      storageDriver: config.storageDriver,
    });
  });

  const routeContext = {
    buildCurriculumSummary,
    buildMapPayload,
    clearFailedLoginAttempts,
    config,
    curriculumRepository,
    getAuthenticatedUser,
    getCurriculumCatalog,
    getLoginThrottleState,
    getTokenFromRequest,
    hashPassword,
    normalizeEmail,
    parseCurriculumSource,
    registerFailedLoginAttempt,
    sanitizeUser,
    securityLimits,
    toggleSubjectProgress,
    userRepository,
    validateProfileUpdate,
    validateRegistrationInput,
    verifyPassword,
  };

  registerCurriculumRoutes(app, routeContext);
  registerAuthRoutes(app, routeContext);
  registerProfileRoutes(app, routeContext);
  registerMapRoutes(app, routeContext);
  registerProgressRoutes(app, routeContext);

  app.use('/api', (req, res) => {
    return res.status(404).json({ error: 'Rota da API nao encontrada.' });
  });

  if (hasFrontendBuild) {
    app.use(express.static(frontendDistDir));

    app.get('/{*path}', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }

      return res.sendFile(frontendIndexPath);
    });
  } else {
    app.get('/', (req, res) => {
      return res.status(200).json({
        ok: true,
        message: 'CourseMapper API ativa. Gere o frontend para servir a interface por este endereco.',
      });
    });
  }

  app.use((error, req, res, next) => {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'O arquivo enviado e grande demais. Use um PDF, DOCX ou imagem menor.' });
    }

    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'Requisicao invalida.' });
    }

    return next(error);
  });

  return app;
}

module.exports = {
  createApp,
  sanitizeUser,
};
