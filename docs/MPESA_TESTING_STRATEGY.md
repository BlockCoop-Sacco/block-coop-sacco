# M-Pesa Payment Integration Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the M-Pesa payment integration in the BlockCoop Sacco platform. The testing approach covers multiple layers including unit tests, integration tests, end-to-end tests, performance tests, and security tests.

## Testing Architecture

### Backend Testing (Node.js/Express)
- **Framework**: Jest
- **Location**: `backend/tests/`
- **Test Types**: Unit, Integration, E2E, Performance, Security, Sandbox

### Frontend Testing (React/TypeScript)
- **Framework**: Vitest + React Testing Library
- **Location**: `src/tests/`
- **Mocking**: MSW (Mock Service Worker)
- **Test Types**: Component, Integration, E2E

## Test Categories

### 1. Unit Tests (`backend/tests/unit/`)

**Purpose**: Test individual components in isolation

**Coverage**:
- Controllers (`mpesaController.test.js`)
- Services (`mpesaService.test.js`)
- Models (`Transaction.test.js`)
- Utilities (`validation.test.js`)

**Key Test Scenarios**:
- Input validation
- Business logic
- Error handling
- Data transformation

### 2. Integration Tests (`backend/tests/integration/`)

**Purpose**: Test component interactions and API endpoints

**Coverage**:
- API endpoints (`mpesa.test.js`)
- Database operations
- External service integration
- Callback handling

**Key Test Scenarios**:
- Payment initiation flow
- Callback processing
- Status queries
- Transaction management

### 3. End-to-End Tests (`backend/tests/e2e/`)

**Purpose**: Test complete user workflows

**Coverage**:
- Full payment flow (`paymentFlow.test.js`)
- Error scenarios
- Recovery mechanisms
- User experience flows

### 4. Performance Tests (`backend/tests/performance/`)

**Purpose**: Validate system performance under load

**Coverage**:
- API response times (`mpesaPerformance.test.js`)
- Concurrent request handling
- Database performance
- Memory usage
- Load testing

**Performance Targets**:
- Payment initiation: < 5 seconds
- Callback processing: < 3 seconds
- Status queries: < 2 seconds
- Concurrent requests: > 5 req/sec

### 5. Security Tests (`backend/tests/security/`)

**Purpose**: Validate security measures and prevent vulnerabilities

**Coverage**:
- Input validation (`mpesaSecurity.test.js`)
- Authentication/Authorization
- Callback security
- Rate limiting
- Data sanitization
- Error information disclosure

**Security Checks**:
- SQL injection prevention
- XSS protection
- CSRF protection
- Input sanitization
- Rate limiting
- Secure error handling

### 6. Sandbox Tests (`backend/tests/sandbox/`)

**Purpose**: Test against M-Pesa sandbox environment

**Coverage**:
- Real API integration (`mpesaSandboxTest.js`)
- Credential validation
- Network connectivity
- API compatibility

**Requirements**:
- Valid M-Pesa sandbox credentials
- Network access to Safaricom APIs
- Proper environment configuration

## Frontend Testing

### Component Tests (`src/tests/components/`)

**Purpose**: Test React components in isolation

**Coverage**:
- `MpesaPaymentForm.test.tsx`
- User interactions
- State management
- Props validation
- Accessibility

### Service Tests (`src/tests/services/`)

**Purpose**: Test frontend API services

**Coverage**:
- `mpesaApi.test.ts`
- API communication
- Error handling
- Data transformation

### E2E Tests (`src/tests/e2e/`)

**Purpose**: Test complete user flows in the browser

**Coverage**:
- `mpesaPaymentFlow.test.tsx`
- User journey testing
- Cross-component integration
- Real user scenarios

## Test Execution

### Running Tests

```bash
# Backend tests
cd backend

# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:security
npm run test:sandbox

# Run with coverage
npm run test:coverage

# Run CI tests (core tests for CI/CD)
npm run test:ci
```

```bash
# Frontend tests
cd frontend

# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Configuration

#### Backend Jest Configuration (`backend/jest.config.js`)
```javascript
export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/database/migrations/**',
    '!src/database/seeds/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### Frontend Vitest Configuration (`vitest.config.ts`)
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/']
    }
  }
});
```

## Test Data Management

### Mock Data
- Standardized test data in `global.testUtils`
- Consistent transaction objects
- Realistic M-Pesa responses
- Edge case scenarios

### Database Testing
- In-memory SQLite for tests
- Isolated test database
- Automatic cleanup
- Transaction rollback

### API Mocking
- MSW for frontend API mocking
- Jest mocks for backend services
- Configurable scenarios
- Realistic response delays

## Continuous Integration

### GitHub Actions Workflow
See `.github/workflows/mpesa-tests.yml` for the complete CI/CD pipeline configuration.

## Test Environment Setup

### Environment Variables
```bash
# Backend (.env.test)
NODE_ENV=test
DATABASE_URL=:memory:
MPESA_CONSUMER_KEY=test_key
MPESA_CONSUMER_SECRET=test_secret
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=test_passkey
MPESA_ENVIRONMENT=sandbox
```

### Dependencies
```bash
# Backend
npm install --save-dev jest supertest @types/jest

# Frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom msw
```

## Coverage Requirements

### Minimum Coverage Targets
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Critical Path Coverage
- Payment initiation: 100%
- Callback handling: 100%
- Error scenarios: 95%
- Security validations: 100%

## Troubleshooting

### Common Issues

1. **Test Database Connection**
   - Ensure SQLite is available
   - Check memory database configuration
   - Verify migration scripts

2. **M-Pesa Sandbox Tests**
   - Validate credentials
   - Check network connectivity
   - Verify API endpoints

3. **Frontend Test Failures**
   - Check MSW handler configuration
   - Verify component imports
   - Ensure proper test environment setup

4. **Performance Test Failures**
   - Check system resources
   - Verify test timeouts
   - Monitor memory usage

### Debug Commands
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- --testNamePattern="payment initiation"

# Run tests with coverage details
npm run test:coverage -- --verbose
```

## Best Practices

### Test Writing
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Test one thing at a time
4. Use realistic test data
5. Clean up after tests

### Mock Management
1. Reset mocks between tests
2. Use consistent mock data
3. Test both success and failure scenarios
4. Verify mock interactions

### Performance Testing
1. Set realistic performance targets
2. Test under various load conditions
3. Monitor resource usage
4. Use consistent test environments

### Security Testing
1. Test all input validation
2. Verify authentication/authorization
3. Check for information disclosure
4. Test rate limiting
5. Validate error handling

## Reporting

### Test Reports
- JUnit XML for CI integration
- HTML coverage reports
- Performance metrics
- Security scan results

### Metrics Tracking
- Test execution time
- Coverage trends
- Failure rates
- Performance benchmarks

## Maintenance

### Regular Tasks
1. Update test dependencies
2. Review and update test data
3. Validate M-Pesa API compatibility
4. Monitor test performance
5. Update documentation

### Test Review Process
1. Code review for new tests
2. Coverage analysis
3. Performance impact assessment
4. Security validation
5. Documentation updates
