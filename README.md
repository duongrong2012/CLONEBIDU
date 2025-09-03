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

## Running the Seeder Scripts

### Create Super Admin Account

To create a super admin account, follow these steps:
1. Run the following command in your terminal:

   ```bash
   npm run seed:super-admin
   ```

   This command executes the seeder script located at `seeders/create-super-admin.js`, which creates a super admin account in your database.

### Update Product Status (After Schema Changes)

If you've recently added the `status` field to the Product model and need to update existing products, run:

```bash
npm run seed:update-product-status
```

This command executes the seeder script located at `seeders/update-product-status.js`, which:
- Finds all products that don't have a `status` field
- Updates them to have `status = PENDING`
- Adds `rejectedReason = null` for consistency
- Provides a summary of all product statuses after the update

**Note**: This seeder is safe to run multiple times - it will only update products that need the status field added.

### Backfill Voucher Target (After Adding `target` Field)

If you added the `target` field to the Voucher model (to support `ORDER_DISCOUNT` and `SHIPPING_DISCOUNT`) and need to backfill existing records, run:

```bash
npm run seed:update-voucher-target
```

This command executes `seeders/update-voucher-target.js`, which:
- Finds all vouchers where `target` is missing or null
- Sets `target = ORDER_DISCOUNT` as the default
- Verifies the update and prints a short summary

Notes:
- Safe to run multiple times; only updates vouchers without a `target` field
- Requires a valid `MONGO_URI` in your `.env`

## Province Seeder

This project includes a seeder script to import all provinces from `province.json` into the MongoDB `provinces` collection.

### Usage

1. **Ensure your `.env` file contains a valid `MONGO_URI` for your MongoDB instance.**
2. Run the following command from the project root:

```bash
npm run seed:province
```

- The script will connect to your database, remove all existing provinces, and import the new data.
- You should see `Provinces seeded successfully!` if the operation completes without errors.

**Alternatively, you can run the script directly:**
```bash
node seeders/province-seeder.js
```

### Notes
- This operation is destructive: it will delete all existing provinces before importing.
- Make sure your database connection string is correct and you have the necessary permissions.

## Ward Seeder

This project includes a seeder script to import all wards from `ward.json` into the MongoDB `wards` collection.

### Usage

1. **Ensure your `.env` file contains a valid `MONGO_URI` for your MongoDB instance.**
2. Run the following command from the project root:

```bash
npm run seed:ward
```

- The script will connect to your database, remove all existing wards, and import the new data.
- You should see `Wards seeded successfully!` if the operation completes without errors.

**Alternatively, you can run the script directly:**
```bash
node seeders/ward-seeder.js
```

### Notes
- This operation is destructive: it will delete all existing wards before importing.
- Make sure your database connection string is correct and you have the necessary permissions.

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
