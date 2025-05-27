const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

// Read all YAML files in the auth and buyer directories
const authDir = path.join(__dirname, 'auth');
const authFiles = fs.readdirSync(authDir);
const buyerDir = path.join(__dirname, 'buyer');
const buyerFiles = fs.readdirSync(buyerDir);

// Merge all YAML files
const mergedSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Bidu API Documentation',
    version: '1.0.0',
    description: 'API documentation for Bidu e-commerce platform',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {},
  paths: {},
};

function mergeYamlFilesFromDir(dirPath, fileList) {
  fileList.forEach(file => {
    if (file.endsWith('.yaml')) {
      const filePath = path.join(dirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const spec = YAML.parse(fileContent);

      // Deep merge schemas in components
      if (spec.components) {
        // Merge schemas
        if (spec.components.schemas) {
          mergedSpec.components.schemas = {
            ...mergedSpec.components.schemas,
            ...spec.components.schemas,
          };
        }
        // Merge other components if any (securitySchemes, parameters, ...)
        Object.keys(spec.components).forEach(key => {
          if (key !== 'schemas') {
            mergedSpec.components[key] = {
              ...mergedSpec.components[key],
              ...spec.components[key],
            };
          }
        });
      }

      // Merge paths
      if (spec.paths) {
        mergedSpec.paths = {
          ...mergedSpec.paths,
          ...spec.paths,
        };
      }
    }
  });
}

// Merge YAML files from both auth and buyer directories
mergeYamlFilesFromDir(authDir, authFiles);
mergeYamlFilesFromDir(buyerDir, buyerFiles);

module.exports = mergedSpec;
