# M-Pesa Integration Test Execution Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git for version control

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd blockcoop-frontend

# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests (recommended for development)
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only
npm run test:security     # Security tests only

# Run tests with coverage
npm run test:coverage

# Run CI tests (core tests for CI/CD)
npm run test:ci

# Run M-Pesa sandbox tests (requires credentials)
npm run test:sandbox
```

### Frontend Tests

```bash
# Run all frontend tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with UI (interactive)
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests once (for CI)
npm run test:run
```

## Test Configuration

### Environment Setup

#### Backend Test Environment
Create `backend/.env.test`:
```bash
NODE_ENV=test
DATABASE_URL=:memory:
MPESA_CONSUMER_KEY=test_key
MPESA_CONSUMER_SECRET=test_secret
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=test_passkey
MPESA_ENVIRONMENT=sandbox
```

#### M-Pesa Sandbox Testing
For sandbox tests, you need real M-Pesa sandbox credentials:
```bash
# In backend/.env.test
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_sandbox_shortcode
MPESA_PASSKEY=your_sandbox_passkey
MPESA_ENVIRONMENT=sandbox
```

## Test Types Explained

### 1. Unit Tests
**Purpose**: Test individual functions and components in isolation

**What they test**:
- Input validation functions
- Business logic calculations
- Data transformation utilities
- Error handling mechanisms

**Example**:
```bash
npm run test:unit
# Tests: validation.test.js, mpesaService.test.js, etc.
```

### 2. Integration Tests
**Purpose**: Test how different parts work together

**What they test**:
- API endpoint functionality
- Database operations
- Service integrations
- Request/response handling

**Example**:
```bash
npm run test:integration
# Tests: mpesa.test.js (API endpoints)
```

### 3. End-to-End Tests
**Purpose**: Test complete user workflows

**What they test**:
- Full payment flow from start to finish
- Error recovery scenarios
- User experience paths
- Cross-component interactions

**Example**:
```bash
npm run test:e2e
# Tests: paymentFlow.test.js, mpesaPaymentFlow.test.tsx
```

### 4. Performance Tests
**Purpose**: Validate system performance under load

**What they test**:
- API response times
- Concurrent request handling
- Memory usage patterns
- Database performance

**Performance Targets**:
- Payment initiation: < 5 seconds
- Callback processing: < 3 seconds
- Status queries: < 2 seconds

**Example**:
```bash
npm run test:performance
# Tests: mpesaPerformance.test.js
```

### 5. Security Tests
**Purpose**: Validate security measures

**What they test**:
- Input validation and sanitization
- Authentication/authorization
- Rate limiting
- Error information disclosure
- CORS policies

**Example**:
```bash
npm run test:security
# Tests: mpesaSecurity.test.js
```

### 6. Sandbox Tests
**Purpose**: Test against real M-Pesa sandbox

**What they test**:
- Real API connectivity
- Credential validation
- Network reliability
- API compatibility

**Requirements**:
- Valid M-Pesa sandbox credentials
- Internet connectivity
- Safaricom sandbox access

**Example**:
```bash
npm run test:sandbox
# Tests: mpesaSandboxTest.js
```

## Interpreting Test Results

### Success Output
```
✅ Unit Tests completed successfully (1234ms)
✅ Integration Tests completed successfully (2345ms)
✅ End-to-End Tests completed successfully (3456ms)

📊 TEST EXECUTION SUMMARY
====================================
⏱️  Total Duration: 7035ms
📦 Test Suites: 3
📈 Results: 3 passed, 0 failed
```

### Failure Output
```
❌ Integration Tests failed with exit code 1 (2345ms)

📊 TEST EXECUTION SUMMARY
====================================
⏱️  Total Duration: 3579ms
📦 Test Suites: 2
   ✅ Unit Tests (1234ms)
   ❌ Integration Tests (2345ms)
📈 Results: 1 passed, 1 failed
```

### Coverage Report
```
=============================== Coverage summary ===============================
Statements   : 85.5% ( 342/400 )
Branches     : 82.1% ( 156/190 )
Functions    : 88.9% ( 80/90 )
Lines        : 85.5% ( 342/400 )
================================================================================
```

## Debugging Failed Tests

### Common Issues and Solutions

#### 1. Database Connection Issues
**Error**: `Database connection failed`
**Solution**:
```bash
# Ensure SQLite is available
npm install sqlite3 better-sqlite3

# Check test database configuration
cat backend/.env.test | grep DATABASE_URL
```

#### 2. M-Pesa API Errors
**Error**: `M-Pesa API authentication failed`
**Solution**:
```bash
# Check credentials in .env.test
# Verify sandbox access
# Test network connectivity
curl -I https://sandbox.safaricom.co.ke
```

#### 3. Frontend Test Failures
**Error**: `Component not found` or `Mock not working`
**Solution**:
```bash
# Clear test cache
npm run test:run -- --clearCache

# Check MSW handlers
# Verify component imports
# Ensure proper test setup
```

#### 4. Performance Test Failures
**Error**: `Response time exceeded threshold`
**Solution**:
- Check system resources
- Verify test environment
- Review performance targets
- Monitor memory usage

### Debug Commands

```bash
# Run specific test file
npm test -- --testNamePattern="payment initiation"

# Run tests with verbose output
npm test -- --verbose

# Run tests with debug information
DEBUG=* npm test

# Run single test suite
npm test tests/integration/mpesa.test.js

# Run tests with coverage details
npm run test:coverage -- --verbose
```

## Best Practices

### During Development
1. **Run tests frequently**: Use watch mode during development
2. **Write tests first**: Follow TDD when adding new features
3. **Test edge cases**: Include error scenarios and boundary conditions
4. **Keep tests isolated**: Each test should be independent
5. **Use descriptive names**: Test names should explain what they verify

### Before Committing
1. **Run all tests**: Ensure nothing is broken
2. **Check coverage**: Maintain minimum coverage thresholds
3. **Review test output**: Look for warnings or deprecations
4. **Update tests**: Modify tests when changing functionality

### Code Review
1. **Review test changes**: Ensure tests cover new functionality
2. **Validate test quality**: Check for proper assertions and setup
3. **Verify coverage**: Ensure coverage doesn't decrease
4. **Test documentation**: Update docs when test behavior changes

## Continuous Integration

### GitHub Actions
Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

### CI Test Flow
1. **Code Quality**: Linting, formatting, TypeScript checks
2. **Unit Tests**: Fast, isolated component tests
3. **Integration Tests**: API and service integration tests
4. **Security Tests**: Vulnerability and security validation
5. **Performance Tests**: Response time and load testing
6. **Coverage Report**: Code coverage analysis and reporting

### CI Failure Handling
1. **Check GitHub Actions logs**: Review detailed error messages
2. **Run tests locally**: Reproduce the failure environment
3. **Fix issues**: Address failing tests or code issues
4. **Re-run CI**: Push fixes to trigger new test run

## Monitoring and Maintenance

### Regular Tasks
- **Weekly**: Review test performance and coverage trends
- **Monthly**: Update test dependencies and configurations
- **Quarterly**: Review and update test strategies and documentation

### Metrics to Track
- Test execution time trends
- Coverage percentage over time
- Failure rates by test type
- Performance benchmark results

### Test Health Indicators
- ✅ All tests passing consistently
- ✅ Coverage above 80% threshold
- ✅ Performance within acceptable limits
- ✅ No security vulnerabilities detected
- ✅ CI pipeline completing successfully

## Getting Help

### Resources
- **Documentation**: `docs/MPESA_TESTING_STRATEGY.md`
- **Test Examples**: Check existing test files for patterns
- **CI Logs**: GitHub Actions provide detailed execution logs
- **Coverage Reports**: HTML reports in `coverage/` directory

### Common Commands Reference
```bash
# Quick test run
npm test

# Full test suite with coverage
npm run test:coverage

# Performance check
npm run test:performance

# Security validation
npm run test:security

# Real M-Pesa integration test
npm run test:sandbox
```
