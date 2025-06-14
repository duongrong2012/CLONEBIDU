const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

// Read all YAML files in the auth, auth-admin, buyer, upload, and seller directories
const authDir = path.join(__dirname, 'auth');
const authFiles = fs.readdirSync(authDir);
const authAdminDir = path.join(__dirname, 'auth-admin');
const authAdminFiles = fs.readdirSync(authAdminDir);
const buyerDir = path.join(__dirname, 'buyer');
const buyerFiles = fs.readdirSync(buyerDir);
const uploadDir = path.join(__dirname, 'upload');
const uploadFiles = fs.readdirSync(uploadDir);
const sellerDir = path.join(__dirname, 'seller');
const sellerFiles = fs.readdirSync(sellerDir);
const userDir = path.join(__dirname, 'user');
const userFiles = fs.readdirSync(userDir);
const categoryDir = path.join(__dirname, 'category');
const categoryFiles = fs.readdirSync(categoryDir);

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

      // Merge paths (deep merge by method)
      if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, methods]) => {
          if (!mergedSpec.paths[path]) {
            mergedSpec.paths[path] = {};
          }
          Object.assign(mergedSpec.paths[path], methods);
        });
      }
    }
  });
}

// Merge YAML files from all directories
mergeYamlFilesFromDir(authDir, authFiles);
mergeYamlFilesFromDir(authAdminDir, authAdminFiles);
mergeYamlFilesFromDir(buyerDir, buyerFiles);
mergeYamlFilesFromDir(uploadDir, uploadFiles);
mergeYamlFilesFromDir(sellerDir, sellerFiles);
mergeYamlFilesFromDir(userDir, userFiles);
mergeYamlFilesFromDir(categoryDir, categoryFiles);

module.exports = mergedSpec;
