# Quy tắc code trong dự án

## 1. Tối ưu và tái sử dụng code

- Luôn nghĩ đến việc code có thể tái sử dụng được không
- Nếu có thể tái sử dụng, viết vào:
  - `Utils/`: Các hàm tiện ích
  - `Constants/`: Các hằng số
- Ví dụ:
  - Các hàm xử lý lỗi -> `error.utils.js`
  - Các hằng số về status -> `constant.js`
  - Các hàm validate -> `validation.utils.js`

## 2. Tận dụng code có sẵn

- LUÔN kiểm tra source code hiện tại trước khi viết code mới
- Tránh việc tạo mới không cần thiết
- Đảm bảo code được thống nhất xuyên suốt dự án
- Ví dụ:
  - Kiểm tra các utils có sẵn
  - Xem xét các patterns đã được sử dụng
  - Tận dụng các hàm helper đã có

## 3. Code đầy đủ và hoàn chỉnh

Khi implement một tính năng mới, phải làm đầy đủ các thành phần:

- Model: Schema và validation
- Service: Business logic
- Controller: Request handling
- Route: API endpoints
- Entry point: Cập nhật trong app.js
- Đảm bảo feature có thể sử dụng được ngay

## 4. Comment chuẩn xác

- Comment phải rõ ràng, đầy đủ và chính xác
- Mục đích:
  - Code dễ đọc
  - Dễ hiểu
  - Dễ bảo trì
- Format comment:
  ```javascript
  /**
   * Mô tả chức năng của function/class
   * @param {Type} paramName - Mô tả parameter
   * @returns {Type} Mô tả giá trị trả về
   */
  ```

## Quy trình kiểm tra trước khi code

1. Kiểm tra source code hiện tại
2. Tìm các đoạn code có thể tái sử dụng
3. Xác định các utils/constants cần thiết
4. Đảm bảo implement đầy đủ các thành phần
5. Comment đầy đủ và chuẩn xác
