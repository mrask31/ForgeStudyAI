# Playwright Smoke Tests

This directory contains automated smoke tests for ForgeNursing navigation and core functionality.

## Quick Start

### Run Tests Locally

1. **Start the development server** (in a separate terminal):
   ```bash
   npm run dev
   ```

2. **Run the smoke tests**:
   ```bash
   npm run test:smoke
   ```

   The tests will automatically use the dev server running on `http://localhost:3000`.

### Alternative: Let Playwright Start the Server

If you don't want to manually start the dev server, Playwright can start it for you automatically. Just run:

```bash
npm run test:smoke
```

The `webServer` configuration in `playwright.config.ts` will start `npm run dev` before running tests.

## What Gets Tested

### Navigation Smoke Tests (`navigation.spec.ts`)

1. **Critical Routes Test**: Verifies all core routes return HTTP 200 and don't show 404:
   - `/` (Home)
   - `/tutor` (Clinical Tutor)
   - `/binder` (My Clinical Binder)
   - `/readiness` (Readiness Dashboard)
   - `/clinical-desk` (Clinical Desk)
   - `/settings` (Settings)

2. **Public Routes Test**: Verifies public pages are accessible without authentication:
   - `/` (Home)
   - `/login`
   - `/signup`
   - `/privacy`
   - `/terms`

3. **Sidebar Navigation Test**: Clicks each sidebar link and verifies:
   - Link is visible
   - Link has correct `href` attribute
   - Navigation updates URL correctly
   - Page loads without 404 errors

4. **Brand Logo Test**: Verifies the app logo/brand links to home correctly.

## Test Reports

After running tests, Playwright generates an HTML report. To view it:

```bash
npx playwright show-report
```

## CI/CD Integration

For CI environments, set the `CI` environment variable:

```bash
CI=true npm run test:smoke
```

This will:
- Retry failed tests 2 times
- Run tests sequentially (not in parallel)
- Use the existing server if available (or start one)

## Customizing Base URL

To test against a different environment (e.g., staging), set the `PLAYWRIGHT_TEST_BASE_URL` environment variable:

```bash
PLAYWRIGHT_TEST_BASE_URL=https://staging.example.com npm run test:smoke
```

## Troubleshooting

### Tests fail with "Navigation timeout"

- Ensure the dev server is running on port 3000
- Check that no other process is using port 3000
- Increase timeout in `playwright.config.ts` if needed

### Sidebar tests fail on mobile viewport

- The sidebar navigation test automatically skips if the sidebar is not visible (mobile view)
- This is expected behavior

### Authentication-required routes return 401/403

- Some routes require authentication
- The tests currently focus on route accessibility, not full authentication flows
- Consider adding authentication setup in test fixtures for more comprehensive testing

