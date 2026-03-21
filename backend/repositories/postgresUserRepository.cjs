const fs = require('fs/promises');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

class PostgresUserRepository {
  constructor(databaseUrl) {
    this.databaseUrl = databaseUrl;
    this.sql = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL nao foi definido para o driver postgres.');
    }

    this.sql = neon(this.databaseUrl);
    const schemaPath = path.resolve(__dirname, '..', 'sql', 'schema.postgres.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    const statements = schemaSql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await this.sql.query(statement);
    }

    this.initialized = true;
  }

  async query(text, params = [], options = {}) {
    await this.init();
    return this.sql.query(text, params, options);
  }

  mapUser(row, progressRows = []) {
    const progress = progressRows.reduce((accumulator, item) => {
      if (!accumulator[item.course_id]) {
        accumulator[item.course_id] = [];
      }

      accumulator[item.course_id].push(item.subject_id);
      return accumulator;
    }, {});

    return {
      id: row.id,
      name: row.name,
      username: row.username || '',
      registration: row.registration,
      email: row.email,
      courseId: row.course_id,
      avatarUrl: row.avatar_url || '',
      passwordHash: row.password_hash,
      sessionToken: row.session_token || '',
      preferences: {
        theme: row.preferences_theme || 'brand',
      },
      progress,
    };
  }

  async getProgressRows(userId) {
    return this.query(
      `select course_id, subject_id
       from user_progress
       where user_id = $1
       order by course_id, subject_id`,
      [userId],
    );
  }

  async findByField(field, value) {
    const allowedFields = new Set(['id', 'registration', 'email', 'session_token']);

    if (!allowedFields.has(field)) {
      throw new Error(`Campo de busca nao suportado: ${field}`);
    }

    const rows = await this.query(
      `select id, name, username, registration, email, course_id, avatar_url, password_hash, session_token, preferences_theme
       from users
       where ${field} = $1
       limit 1`,
      [value],
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const progressRows = await this.getProgressRows(row.id);
    return this.mapUser(row, progressRows);
  }

  async findByToken(token) {
    return this.findByField('session_token', token);
  }

  async findByRegistration(registration) {
    return this.findByField('registration', registration);
  }

  async findByEmail(email) {
    return this.findByField('email', email);
  }

  async create(user) {
    await this.init();
    await this.sql.transaction((txn) => {
      const queries = [
        txn`insert into users (
          id, name, username, registration, email, course_id, avatar_url,
          password_hash, session_token, preferences_theme
        )
        values (
          ${user.id}, ${user.name}, ${user.username || ''}, ${user.registration}, ${user.email},
          ${user.courseId}, ${user.avatarUrl || ''}, ${user.passwordHash},
          ${user.sessionToken || ''}, ${user.preferences?.theme || 'brand'}
        )`,
      ];

      for (const [courseId, subjectIds] of Object.entries(user.progress || {})) {
        for (const subjectId of subjectIds) {
          queries.push(
            txn`insert into user_progress (user_id, course_id, subject_id)
                values (${user.id}, ${courseId}, ${subjectId})`,
          );
        }
      }

      return queries;
    });

    return user;
  }

  async updateById(id, updater) {
    const existingUser = await this.findByField('id', id);

    if (!existingUser) {
      return null;
    }

    const nextUser = typeof updater === 'function'
      ? updater(existingUser)
      : { ...existingUser, ...updater };

    await this.init();
    await this.sql.transaction((txn) => {
      const queries = [
        txn`update users
            set name = ${nextUser.name},
                username = ${nextUser.username || ''},
                registration = ${nextUser.registration},
                email = ${nextUser.email},
                course_id = ${nextUser.courseId},
                avatar_url = ${nextUser.avatarUrl || ''},
                password_hash = ${nextUser.passwordHash},
                session_token = ${nextUser.sessionToken || ''},
                preferences_theme = ${nextUser.preferences?.theme || 'brand'},
                updated_at = now()
            where id = ${id}`,
        txn`delete from user_progress where user_id = ${id}`,
      ];

      for (const [courseId, subjectIds] of Object.entries(nextUser.progress || {})) {
        for (const subjectId of subjectIds) {
          queries.push(
            txn`insert into user_progress (user_id, course_id, subject_id)
                values (${id}, ${courseId}, ${subjectId})`,
          );
        }
      }

      return queries;
    });

    return nextUser;
  }

  async updateByToken(token, updater) {
    const existingUser = await this.findByToken(token);

    if (!existingUser) {
      return null;
    }

    return this.updateById(existingUser.id, updater);
  }
}

module.exports = PostgresUserRepository;
