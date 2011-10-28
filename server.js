var cluster = require('cluster');

cluster('./app')
  .set('workers', 1)
  .use(cluster.debug())
  .use(cluster.logger('logs'))
  .use(cluster.pidfiles('pids'))
  .listen(process.env.PORT || 3000);
