// api/index.js
const { createServer } = require('http');
const path = require('path');

// Đường dẫn đến file main đã build
const mainPath = path.join(__dirname, '../dist/main.js');

// Tạo server đơn giản để chạy NestJS
const server = createServer((req, res) => {
  // Load NestJS app
  delete require.cache[require.resolve(mainPath)];
  require(mainPath);

  // NestJS sẽ tự xử lý req/res
  // Không cần làm gì thêm
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`NestJS app running on port ${port}`);
});
