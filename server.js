'use strict';
require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

// Hardcoded MongoDB connection string
const mongoURI = 'mongodb+srv://nandoblaze1337:vaiamerda112@cluster0.3wgnqvd.mongodb.net/message';

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// Import routes
const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

// Create Express application
const app = express();

// Serve static files
app.use('/public', express.static(process.cwd() + '/public'));

// Set up middleware
app.use(cors({ origin: '*' }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'self'"],
    }
  },
  referrerPolicy: { policy: "same-origin" }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sample front-end routing
app.route('/b/:board/').get((req, res) => {
  res.sendFile(process.cwd() + '/views/board.html');
});

app.route('/b/:board/:threadid').get((req, res) => {
  res.sendFile(process.cwd() + '/views/thread.html');
});

// Index page routing
app.route('/').get((req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// FCC testing routes
fccTestingRoutes(app);

// API routing
app.use('/api', apiRoutes); // Ensure this calls the correct function

// 404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404).type('text').send('Not Found');
});

// Start the server and tests
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

// Export app for testing
module.exports = app;
