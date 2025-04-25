# Express Authentication API

API xác thực người dùng sử dụng Express.js và MongoDB.

## Cài đặt

1. Clone repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Cài đặt các phụ thuộc:

```bash
npm install
```

3. Tạo tệp .env và cấu hình các biến môi trường:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/auth-demo
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

4. Khởi động máy chủ:

```bash
npm run watch:dev
```

## API Endpoints

### Xác thực

#### Đăng ký

- **URL**: `/api/auth/sign-up`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```

#### Đăng nhập

- **URL**: `/api/auth/sign-in`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Đăng xuất

- **URL**: `/api/auth/sign-out`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <access_token>`

#### Làm mới token

- **URL**: `/api/auth/refresh-token`
- **Method**: `POST`
- **Cookies**: `refreshToken`

### Người dùng

#### Lấy thông tin người dùng hiện tại

- **URL**: `/api/users/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`

#### Cập nhật thông tin người dùng

- **URL**: `/api/users/update-me`
- **Method**: `PATCH`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**:
  ```json
  {
    "firstName": "Updated First Name",
    "lastName": "Updated Last Name",
    "email": "updated@example.com"
  }
  ```

#### Xóa tài khoản người dùng

- **URL**: `/api/users/delete-me`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <access_token>`

## Bảo mật

- Mật khẩu được mã hóa trước khi lưu vào cơ sở dữ liệu
- Sử dụng JWT để xác thực
- Access token hết hạn sau 15 phút
- Refresh token hết hạn sau 7 ngày
- Cookies được đặt với cờ httpOnly và secure (trong môi trường production)
