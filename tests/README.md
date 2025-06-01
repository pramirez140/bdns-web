# Test Files and Debug Scripts

This folder contains various test files and debug scripts that are not part of the main application codebase.

## Test Files

### API Testing
- **`test-api.js`** - Basic API endpoint testing
- **`test-api.ts`** - TypeScript version of API testing  
- **`test-integration.js`** - Integration tests for BDNS API
- **`simple-test.js`** - Simple functionality tests

### Email Testing
- **`test-email-dev.js`** - Email functionality testing in development
- **`test-email-send.js`** - Email sending tests
- **`test-email-docker.js`** - Email testing within Docker environment

### Debug Scripts
- **`debug-response.js`** - Debug API responses
- **`debug-detailed.js`** - Detailed debugging output

### Sync Testing
- **`simple-change-detection.js`** - Basic change detection testing
- **`enhanced-sync-with-change-detection.js`** - Advanced sync testing with change detection

## Usage

These files are standalone scripts that can be run independently for testing various aspects of the system:

```bash
# Run API tests
node tests/test-api.js

# Test email functionality
node tests/test-email-dev.js

# Debug API responses
node tests/debug-response.js
```

## Note

These test files are isolated from the main application and can be safely modified or removed without affecting the core functionality.