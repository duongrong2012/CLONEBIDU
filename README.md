# Authentication API

User authentication API using Express.js and MongoDB.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:

```bash
npm install
```

3. Create .env file and configure environment variables:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/your-database
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
```

4. Start the server:

```bash
npm run dev
```

## API Endpoints

### Authentication

#### Register

- **POST** `/auth-buyer/register`
- Request body:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }
  ```

#### Login

- **POST** `/auth-buyer/login`
- Request body:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Logout

- **POST** `/auth-buyer/logout`
- Requires authentication token

#### Refresh Token

- **POST** `/auth-buyer/refresh-token`
- Request body:
  ```json
  {
    "refreshToken": "your-refresh-token"
  }
  ```

### User

#### Get Current User

- **GET** `/auth-buyer/me`
- Requires authentication token

#### Update User

- **PUT** `/auth-buyer/me`
- Requires authentication token
- Request body:
  ```json
  {
    "fullName": "New Name",
    "email": "newemail@example.com"
  }
  ```

#### Delete User

- **DELETE** `/auth-buyer/me`
- Requires authentication token

## Security

- Passwords are encrypted before storing in the database
- JWT tokens are used for authentication
- Refresh tokens are used for token rotation
- CORS is enabled for specified origins
- Input validation is implemented
- Error handling middleware is in place
