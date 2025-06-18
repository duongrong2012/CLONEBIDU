# Coding Rules in the Project

## 1. Code Optimization and Reusability

- Always consider if the code can be reused
- If reusable, write in:
  - `Utils/`: Utility functions
  - `Constants/`: Constants
- Examples:
  - Error handling functions -> `error.utils.js`
  - Status constants -> `constant.js`
  - Validation functions -> `validation.utils.js`

## 2. Leverage Existing Code

- ALWAYS check existing source code before writing new code
- Avoid unnecessary creation
- Ensure code consistency throughout the project
- Examples:
  - Check existing utils
  - Review existing patterns
  - Utilize existing helper functions

## 3. Complete and Comprehensive Code

When implementing a new feature, ensure all components are included:

- Model: Schema and validation
- Service: Business logic
- Controller: Request handling
- Route: API endpoints
- Entry point: Update in app.js
- Ensure the feature is immediately usable

## 4. Accurate Comments

-Comments must write in english
- Comments must be clear, complete, and accurate
- Purpose:
  - Readable code
  - Easy to understand
  - Easy to maintain
- Comment format:
  ```javascript
  /**
   * Description of function/class functionality
   * @param {Type} paramName - Parameter description
   * @returns {Type} Return value description
   */
  ```

## 5. Everything must write in English (including code,comment,...)

## 6. Never ask the user for confirmation about making a change (e.g. never ask questions like "Do you want me to do this?" or "Do you need me to help?"). Always automatically apply the change without asking for confirmation, to avoid wasting unnecessary requests.

## 7. API Design and Middleware Architecture

### 7.1 Data Flow and Validation
- When designing an API, all data must pass through middleware before reaching the controller
- Middleware is responsible for:
  - Validating all incoming data (request body, query parameters, path parameters)
  - Filtering and sanitizing data
  - Converting data types if necessary
  - Checking business rules and permissions
  - Preparing validated data for controller consumption

### 7.2 Controller Data Source
- Controllers should ONLY receive data from middleware
- Controllers should NOT directly access or process raw request data
- Controllers should NOT perform validation or data filtering
- Controllers should focus on:
  - Calling appropriate services
  - Formatting responses
  - Handling unexpected errors

### 7.3 Error Handling Strategy
- **Middleware Level**: Handle all predictable and foreseeable errors
  - Validation errors (data type, format, required fields)
  - Business rule violations
  - Permission/authorization errors
  - Resource existence checks
  - Data integrity constraints
- **Controller Level**: Handle only unexpected errors
  - Service execution failures
  - Database connection issues
  - External API failures
  - Unhandled exceptions
- **Service Level**: Handle only unexpected errors
  - Database operation failures
  - External service failures
  - Complex business logic exceptions

### 7.4 Middleware Responsibilities
- **Input Validation**: Ensure all required fields are present and valid
- **Data Filtering**: Remove unwanted fields and sanitize data
- **Type Conversion**: Convert string inputs to appropriate types (numbers, booleans, dates)
- **Business Validation**: Check business rules, permissions, and data relationships
- **Data Preparation**: Format data for controller consumption (e.g., `req.validatedData`)

### 7.5 Service Responsibilities
- **Business Logic**: Implement core business operations
- **Data Operations**: Handle database queries and transactions
- **External Integrations**: Manage third-party service calls
- **Complex Calculations**: Perform business calculations and transformations

## Pre-coding Checklist

1. Check existing source code
2. Find reusable code segments
3. Identify required utils/constants
4. Ensure complete implementation of all components
5. Provide complete and accurate comments
6. Everything must write in English
7. Design middleware for data validation and filtering
8. Ensure controllers only receive validated data from middleware
9. Plan error handling strategy (predictable vs unexpected errors)
