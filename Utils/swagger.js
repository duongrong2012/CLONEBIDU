const swaggerJsdoc = require('swagger-jsdoc');
const mergedSpec = require('../OpenApi');

const options = {
  definition: mergedSpec,
  apis: ['./Routes/*.js', './Controllers/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
