# Project Codex Rules

These instructions apply to the entire `Bidu-Server` repository.

## Core Working Rules

- Check the existing source code before writing new code.
- Reuse existing utilities, middleware, helpers, and local patterns whenever practical.
- Keep changes surgical and avoid creating new abstractions for one-off code.
- Write all code, comments, identifiers, documentation updates, and user-facing strings in English.
- Do not ask for permission to make changes that the user already requested.
- This does not prohibit clarification questions. Ask before coding when required information is missing, multiple interpretations affect behavior, or an assumption would affect security, data integrity, external integrations, or public API contracts.

## Clarification And Required Inputs

- Distinguish a confirmation question from a required-information question:
  - Do not ask: "Do you want me to implement the requested change?"
  - Ask when needed: "Which OAuth providers and token types must this endpoint support?"
- Do not silently choose a security-sensitive or business-sensitive behavior when the repository does not establish it.
- Before implementing a feature, identify any information only the user can provide, including:
  - Environment variables, API keys, client IDs, client secrets, certificates, and webhook secrets
  - Third-party provider names, SDKs, token types, redirect URIs, scopes, and account-linking rules
  - Business rules, authorization behavior, data migration decisions, and externally visible API contracts
- If any required input is missing:
  1. State what is missing and why it is required.
  2. Ask one concise clarification question before implementing the dependent behavior.
  3. Continue only with independent work that cannot encode the wrong contract.
- Never make a required security check optional merely because its environment variable is absent.
- Do not use patterns such as `process.env.VALUE && validate(process.env.VALUE)` for required security configuration. Validate required configuration explicitly and fail fast with a clear configuration error.
- If a safe local placeholder is appropriate, mark it clearly as a placeholder and do not describe the feature as complete or production-ready.

## External Integrations And Configuration

For OAuth, payments, storage, email, webhooks, analytics, or any other third-party integration:

1. Define the provider contract before coding: accepted credential or token type, verification method, required claims, expected audience or application ID, and account-linking behavior.
2. Inspect the repository for existing environment conventions and example env files.
3. List every new environment variable and classify it as required or optional.
4. Add or update the repository's safe environment template and setup documentation. Never write real secrets into tracked files.
5. Add validation for missing required configuration and tests for missing, invalid, and mismatched configuration.
6. In the final response, explicitly list user actions still required, such as creating provider credentials or setting environment variables.
7. Do not claim the integration is complete until required user-provided configuration has either been supplied or clearly reported as outstanding.

## Reusability

- Always consider whether new code can be reused.
- Put reusable utility functions in `Utils/`.
- Put shared constants in `Constants/`.
- Follow existing naming and structure, for example:
  - Error helpers in `error.utils.js`
  - Status constants in `constant.js`
  - Validation helpers in `validation.utils.js`

## Feature Completeness

When implementing a new feature, include every required layer so the feature is immediately usable:

- Model: schema and validation
- Service: business logic
- Controller: request handling
- Route: API endpoints
- Entry point: update `app.js` when needed
- Configuration: required environment variables, validation, safe templates, and setup documentation
- External contract: provider/token assumptions and required user actions

## Comments

- Comments must be written in English.
- Comments must be clear, complete, and accurate.
- Use comments only when they improve readability or maintainability.
- Prefer this JSDoc format when documenting functions or classes:

```javascript
/**
 * Description of function/class functionality
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 */
```

## API Design And Middleware Architecture

### Data Flow And Validation

- All API data must pass through middleware before reaching controllers.
- Middleware is responsible for validating request body, query parameters, and path parameters.
- Middleware must filter, sanitize, and convert data types when necessary.
- Middleware must check business rules, permissions, and data relationships.
- Middleware should prepare validated data for controllers, for example on `req.validatedData`.

### Controllers

- Controllers should only consume data prepared by middleware.
- Controllers should not directly access or process raw request data.
- Controllers should not perform validation or data filtering.
- Controllers should focus on calling services, formatting responses, and handling unexpected errors.

### Services

- Services should implement core business operations.
- Services should handle database queries, transactions, third-party integrations, and complex calculations.
- Services should handle only unexpected errors such as database failures, external service failures, or complex business logic exceptions.

### Error Handling Strategy

- Middleware handles predictable errors:
  - Validation errors
  - Business rule violations
  - Permission and authorization errors
  - Resource existence checks
  - Data integrity constraints
- Controllers handle only unexpected errors:
  - Service execution failures
  - Database connection issues
  - External API failures
  - Unhandled exceptions
- Services handle only unexpected errors:
  - Database operation failures
  - External service failures
  - Complex business logic exceptions

## Required Utilities And Middleware

- Use `catchAsync` from `Utils/error.utils.js` in controllers for unexpected async errors.
- Use `AppError` from `Utils/error.utils.js` in middleware for expected errors such as validation, business logic, and permission errors.
- Use `verifyToken` from `Middlewares/auth.middleware.js` for APIs that require authentication.
- Use `response.success` from `Utils/response.utils.js` in controllers for standardized success responses.
- For paginated APIs:
  - Use the `paginate` method in service classes, such as `BaseService`, for pagination logic.
  - Use `groupPagination` from `Utils/response.utils.js` in controllers to format paginated data and metadata.
- Use these helpers only in their intended layer.

## Standard Error Response Format

All APIs must return errors in this exact structure:

```json
{
  "status": "error",
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "code", "message": "Voucher code must be uppercase." },
    { "field": "discountValue", "message": "Percentage discount cannot exceed 100%." }
  ]
}
```

- `status`: always `"error"` for error responses.
- `code`: HTTP status code.
- `message`: brief description of the error type.
- `errors`: array of detailed error objects; use an empty array for simple errors.
- Each error object must include:
  - `field`: the field that caused the error, or `"general"` for non-field errors.
  - `message`: the specific error message.

Use `AppError` in middleware:

```javascript
return next(new AppError('Validation failed', 400, [
  { field: 'code', message: 'Voucher code must be uppercase.' }
]));
```

Format `express-validator` errors like this:

```javascript
const formattedErrors = errors.array().map(err => ({
  field: err.path,
  message: err.msg,
}));
return next(new AppError('Validation failed', 400, formattedErrors));
```

- Let `catchAsync` and the error middleware handle controller-level formatting.
- Swagger documentation must reflect this error format.
- Frontend clients expect this exact structure.

## API Change Test Rule

When a task changes API files under `Routes/`, `Controllers/`, `Services/`, or `Middlewares/`:

- Run automation tests before finishing the task.
- Prefer targeted tests that directly cover the changed behavior first.
- Run the full test suite if the change has broad impact.
- Skip tests only when the user explicitly asks not to run them.

Example commands:

```bash
npm test -- __tests__/product/get-products.test.js --runInBand
npm test
```

## Pre-Coding Checklist

1. Check existing source code.
2. Find reusable code segments.
3. Identify required utilities and constants.
4. Identify unclear requirements and assumptions that affect security, business behavior, data, integrations, or API contracts.
5. Identify all required user-provided inputs and ask for any that are missing before coding dependent behavior.
6. Inventory new environment variables and decide how missing configuration will fail fast.
7. Ensure the implementation includes all required layers.
8. Add accurate English comments only where useful.
9. Keep all code and text in English.
10. Design middleware for validation and filtering.
11. Ensure controllers only receive validated data from middleware.
12. Plan error handling for predictable versus unexpected errors.
13. Plan tests for missing configuration and external-provider failure cases.
14. Plan the relevant automation test command for API changes.

## Completion Checklist

Before reporting a feature as complete:

1. Review the diff for every new `process.env` reference and external dependency.
2. Confirm each required env variable is validated, documented, and included in a safe template.
3. Confirm no security check is conditionally skipped because configuration is missing.
4. Confirm tests cover the configured and missing-configuration paths.
5. State all remaining setup steps or required values in the final response.
