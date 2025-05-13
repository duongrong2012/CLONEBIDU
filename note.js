const prettierConfig = {
  semi: true, // Tự động thêm dấu chấm phẩy (;) ở cuối câu lệnh
  tabWidth: 2, // Số khoảng trắng cho mỗi tab
  printWidth: 100, // Độ dài tối đa của mỗi dòng code
  singleQuote: true, // Sử dụng dấu nháy đơn (') thay vì nháy kép (")
  trailingComma: 'es5', // Thêm dấu phẩy ở cuối các phần tử trong mảng/object theo chuẩn ES5
  bracketSpacing: true, // Thêm khoảng trắng giữa dấu ngoặc nhọn trong object
  arrowParens: 'avoid', // Bỏ dấu ngoặc đơn khi arrow function chỉ có 1 tham số
  endOfLine: 'auto', // Tự động xử lý ký tự xuống dòng phù hợp với hệ điều hành
};

const eslintConfig = {
  env: {
    node: true, // Cho phép sử dụng các biến môi trường của Node.js
    es2021: true, // Hỗ trợ các tính năng của ES2021
  },
  extends: [
    'eslint:recommended', // Sử dụng các rules được khuyến nghị của ESLint
    'plugin:node/recommended', // Sử dụng các rules cho Node.js
    'plugin:prettier/recommended', // Tích hợp với Prettier để tránh xung đột
  ],
  parserOptions: {
    ecmaVersion: 'latest', // Sử dụng phiên bản ECMAScript mới nhất
    sourceType: 'module', // Cho phép sử dụng import/export
  },
  rules: {
    // Yêu cầu sử dụng module.exports thay vì exports
    'node/exports-style': ['error', 'module.exports'],

    // Yêu cầu thêm phần mở rộng file trong import
    'node/file-extension-in-import': ['error', 'always'],

    // Yêu cầu sử dụng các biến global của Node.js
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/url-search-params': ['error', 'always'],
    'node/prefer-global/url': ['error', 'always'],

    // Yêu cầu sử dụng Promise cho các API của Node.js
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'error',

    // Cảnh báo khi sử dụng console.log
    'no-console': 'warn',

    // Báo lỗi với biến không sử dụng (trừ những biến bắt đầu bằng _)
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Tích hợp với Prettier
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
  },
};
