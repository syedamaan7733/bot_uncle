module.exports = {
  apps: [
    {
      name: 'bot-uncle-api',
      script: 'dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '768M',
    },
  ],
};
