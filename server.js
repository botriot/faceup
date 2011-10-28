require('./app').listen(process.env.PORT || 3000)

// var cluster = require('cluster');
// 
// cluster('./app')
//   .set('workers', 1)
//   .use(cluster.debug())
//   .listen(process.env.PORT || 3000);
