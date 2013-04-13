if (!process.env.MASHAPE_API_KEY || !process.env.MASHAPE_API_SECRET) {
  throw new Error("Need to set MASHAPE_API_KEY and MASHAPE_API_SECRET")
}

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , Mixpanel = require('mixpanel')

var app = module.exports = express()
var mixpanel;

if (process.env.MIXPANEL) {
  mixpanel = Mixpanel.init(process.env.MIXPANEL)
}

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(function(req, res, next) {
    if (mixpanel) {
      req.metrics = mixpanel
    } else {
      req.metrics = {
        track: function() {}
      }
    }
    next()
  });
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);
app.get('/check', routes.check);
app.get('/img', routes.img);
app.get('/img.jpg', routes.img);
app.get('/img.jpeg', routes.img);

if (require.main === module) {
  app.listen(process.env.PORT || 3000);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
