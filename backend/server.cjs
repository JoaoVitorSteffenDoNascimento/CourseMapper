const config = require('./config.cjs');
const { createUserRepository } = require('./repositories/index.cjs');
const { createApp } = require('./app.cjs');

const userRepository = createUserRepository();
const app = createApp({ userRepository, config });

userRepository.init()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`CourseMapper backend ativo em http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao iniciar o backend:', error);
    process.exit(1);
  });
