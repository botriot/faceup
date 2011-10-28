var cluster = require('cluster');

cluster('./app')
  .use(cluster.logger('logs'))
  .use(cluster.pidfiles('pids'))
  .listen(process.env.PORT || 3000);
