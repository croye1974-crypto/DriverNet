# DriveNet Testing Infrastructure

## Overview
Comprehensive testing suite for DriveNet including E2E tests, API tests, load testing, and WebSocket stress testing.

## Test Types

### 1. API Health Tests
Quick verification that the server is responding correctly.

```bash
npx playwright test tests/api.health.spec.ts
```

### 2. Smoke Tests
Basic UI and navigation tests to ensure core functionality works.

```bash
npx playwright test tests/smoke.spec.ts
```

**Tests:**
- Homepage loads with DriveNet title
- Bottom navigation has 4 tabs
- Add Delivery Job dialog opens

### 3. Multi-User E2E Tests
Simulates multiple drivers using the app simultaneously.

```bash
npx playwright test tests/multiuser.e2e.spec.ts
```

**Flow:**
- Two drivers create sessions with test helper
- Each creates a job at different locations
- Driver A checks in (GPS captured)
- Both view map with checked-in driver markers

### 4. Load Testing with Artillery
Simulates 80+ concurrent users with HTTP and WebSocket traffic.

```bash
# Install Artillery (first time only)
npm install -g artillery

# Run load test
artillery run artillery.yml
```

**Test phases:**
- Warmup: 10 users/sec for 60s
- Ramp: 25→80 users/sec for 120s  
- Sustain: 80 users/sec for 180s

**Thresholds:**
- P95 response time: <900ms
- P99 response time: <1600ms
- Success rate: >95%

### 5. WebSocket Stress Test
Simulates many drivers sending live GPS location updates.

```bash
# 100 WebSocket clients (default)
tsx scripts/pingers.ts

# Custom number of clients
CLIENTS=500 tsx scripts/pingers.ts
```

## Test Helper API

In development mode, test endpoints are available:

### Create Test Session
```bash
POST /api/test/seed-user
{
  "id": "test-driver-123",
  "email": "test@drivenet.local",
  "sub": "active",
  "name": "Test Driver"
}
```

### Logout Test Session
```bash
POST /api/test/logout
```

## Running Tests in CI/CD

```bash
# All tests
npx playwright test

# Specific project
npx playwright test --project=chromium
npx playwright test --project=mobile

# With HTML report
npx playwright test --reporter=html
npx playwright show-report
```

## Test Configuration

**Playwright Config** (`playwright.config.ts`):
- Base URL: http://localhost:5000
- Projects: Desktop Chrome, iPhone 13
- Screenshots/videos on failure
- Trace on first retry

**Artillery Config** (`artillery.yml`):
- Target: http://localhost:5000
- WebSocket support enabled
- Performance thresholds configured

## Best Practices

1. **API Tests** - Fast, no browser needed, run first
2. **Smoke Tests** - Quick UI verification
3. **E2E Tests** - Full user flows with multiple actors
4. **Load Tests** - Performance under stress
5. **WS Tests** - Real-time connection stability

## Test Data

All tests use:
- Mock users created via `/api/test/seed-user`
- Test locations (London, Birmingham, Bristol, etc.)
- No real Stripe subscriptions required
- GPS coordinates mocked or provided

## Troubleshooting

**Browser dependencies missing:**
```bash
# Tests run without browser UI in Replit
npx playwright test  # (no --headed flag)
```

**WebSocket connection issues:**
```bash
# Check server is running on port 5000
curl http://localhost:5000/api/health
```

**Load test failures:**
```bash
# Reduce concurrent users
# Edit artillery.yml and lower arrivalRate
```
