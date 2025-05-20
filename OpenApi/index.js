const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

// Đọc tất cả các file YAML trong thư mục auth
const authDir = path.join(__dirname, 'auth');
const authFiles = fs.readdirSync(authDir);

// Hợp nhất tất cả các file YAML
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

// Đọc và hợp nhất từng file
authFiles.forEach(file => {
  if (file.endsWith('.yaml')) {
    const filePath = path.join(authDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const spec = YAML.parse(fileContent);

    // Merge sâu các schema trong components
    if (spec.components) {
      // Merge schemas
      if (spec.components.schemas) {
        mergedSpec.components.schemas = {
          ...mergedSpec.components.schemas,
          ...spec.components.schemas,
        };
      }
      // Merge các thành phần khác nếu có (securitySchemes, parameters, ...)
      Object.keys(spec.components).forEach(key => {
        if (key !== 'schemas') {
          mergedSpec.components[key] = {
            ...mergedSpec.components[key],
            ...spec.components[key],
          };
        }
      });
    }

    // Hợp nhất paths
    if (spec.paths) {
      mergedSpec.paths = {
        ...mergedSpec.paths,
        ...spec.paths,
      };
    }
  }
});

module.exports = mergedSpec;
