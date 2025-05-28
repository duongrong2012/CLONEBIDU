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

## Pre-coding Checklist

1. Check existing source code
2. Find reusable code segments
3. Identify required utils/constants
4. Ensure complete implementation of all components
5. Provide complete and accurate comments
6. Everything must write in English
