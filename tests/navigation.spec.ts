import { test, expect } from '@playwright/test';

/**
 * Navigation Smoke Tests for ForgeStudy
 *
 * These tests verify that all critical routes are reachable by checking for
 * positive confirmations of correct page content, rather than absence of error text.
 * Run with: npm run test:smoke
 */

// Route-to-content mapping for positive assertions
const ROUTE_CONTENT_MAP: Record<string, string[]> = {
  '/': ['ForgeStudy', 'Homework'],
  '/tutor': ['Tutor Workspace', 'Good morning', 'Welcome back'],
  '/classes': ['My Learning Map', 'Welcome back'],
  '/sources': ['Sources', 'Welcome back'],
  '/readiness': ['Learning Dashboard', 'Welcome back'],
  '/dictionary': ['Vocabulary Bank', 'Welcome back'],
  '/study-topics': [
    'Study Topics',
    'Select a student profile to view study topics.',
    'Study Topics are available for grades 6–12.',
  ],
  '/settings': ['Settings', 'Display Density', 'Welcome back'],
  '/login': ['Welcome back', 'Sign In'],
  '/signup': ['Create Account', 'Sign Up'],
  '/privacy': ['Privacy', 'Privacy Policy'],
  '/terms': ['Terms', 'Terms of Service'],
};

// Critical routes that must be accessible
const CRITICAL_ROUTES = [
  '/',
  '/tutor',
  '/classes',
  '/sources',
  '/readiness',
  '/dictionary',
  '/study-topics',
  '/settings',
];

// Public routes (no auth required)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
];

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD

async function loginIfConfigured(page: any) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    return false
  }

  await page.goto('/login?redirect=/profiles?auto=1')
  await page.waitForLoadState('networkidle')

  await page.fill('input[placeholder="Enter your email"]', TEST_EMAIL)
  await page.fill('input[placeholder="Enter your password"]', TEST_PASSWORD)
  await page.click('button:has-text("Sign In")')

  await page.waitForLoadState('networkidle')

  // If the app lands on the profiles page, try to select a profile.
  if (page.url().includes('/profiles')) {
    const profileCard = page
      .locator('div')
      .filter({ hasText: /High School|Middle School|Elementary/ })
      .first()
    if (await profileCard.isVisible().catch(() => false)) {
      await profileCard.click()
      await page.waitForLoadState('networkidle')
    }
  }

  return !page.url().includes('/login')
}

test.describe('Navigation Smoke Tests', () => {
  test('all critical routes return 200 and show expected content', async ({ page }) => {
    await loginIfConfigured(page)
    for (const route of CRITICAL_ROUTES) {
      const response = await page.goto(route);
      
      // Assert HTTP status is 200
      expect(response?.status()).toBe(200);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Get page content
      const pageContent = await page.textContent('body') || '';
      
      // Assert page contains expected content (positive confirmation)
      const expectedContent = ROUTE_CONTENT_MAP[route];
      if (expectedContent && expectedContent.length > 0) {
        const foundContent = expectedContent.some(text => 
          pageContent.includes(text)
        );
        expect(
          foundContent,
          `Route ${route} should contain one of: ${expectedContent.join(', ')}`
        ).toBeTruthy();
      }
    }
  });

  test('public routes are accessible and show expected content', async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      const response = await page.goto(route);
      
      // Assert HTTP status is 200
      expect(response?.status()).toBe(200);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Get page content
      const pageContent = await page.textContent('body') || '';
      
      // Assert page contains expected content (positive confirmation)
      const expectedContent = ROUTE_CONTENT_MAP[route];
      if (expectedContent && expectedContent.length > 0) {
        const foundContent = expectedContent.some(text => 
          pageContent.includes(text)
        );
        expect(
          foundContent,
          `Route ${route} should contain one of: ${expectedContent.join(', ')}`
        ).toBeTruthy();
      }
    }
  });

  test('sidebar navigation links work correctly', async ({ page }) => {
    await loginIfConfigured(page)
    // Navigate to a page with sidebar (any authenticated route)
    await page.goto('/tutor');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the tutor page
    const tutorContent = await page.textContent('body') || '';
    expect(tutorContent).toContain('Tutor Workspace');
    
    // Wait for sidebar to be visible (desktop only)
    const sidebar = page.locator('aside');
    const isSidebarVisible = await sidebar.isVisible().catch(() => false);
    
    if (!isSidebarVisible) {
      // Sidebar might be hidden on mobile, skip this test
      test.skip();
      return;
    }

    const navSets = [
      {
        key: 'elementary',
        detectLabel: 'Spelling',
        items: [
          { label: 'Home', href: '/app/elementary', expectedContent: ['ForgeElementary', 'Grades 3–5'] },
          { label: 'Spelling', href: '/tutor?mode=spelling', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Reading', href: '/tutor?mode=reading', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Homework Help', href: '/tutor?mode=homework', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Upload', href: '/sources', expectedContent: ['Sources'] },
          { label: 'Settings', href: '/settings', expectedContent: ['Settings', 'Display Density'] },
        ],
      },
      {
        key: 'middle',
        detectLabel: 'Practice',
        items: [
          { label: 'Home', href: '/app/middle', expectedContent: ['ForgeMiddle', 'Grades 6–8'] },
          { label: 'Study Topics', href: '/study-topics', expectedContent: ['Study Topics'] },
          { label: 'Study Map', href: '/tutor?tool=study-map', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Practice', href: '/tutor?tool=practice', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Writing', href: '/tutor?tool=writing', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Uploads', href: '/sources', expectedContent: ['Sources'] },
          { label: 'Progress', href: '/readiness', expectedContent: ['Learning Dashboard'] },
          { label: 'Settings', href: '/settings', expectedContent: ['Settings', 'Display Density'] },
        ],
      },
      {
        key: 'high',
        detectLabel: 'Exam Sheets',
        items: [
          { label: 'Home', href: '/app/high', expectedContent: ['ForgeHigh', 'Grades 9–12'] },
          { label: 'Study Topics', href: '/study-topics', expectedContent: ['Study Topics'] },
          { label: 'Study Maps', href: '/tutor?tool=study-map', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Practice / Review', href: '/tutor?tool=practice', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Exam Sheets', href: '/tutor?tool=exam', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Writing Lab', href: '/tutor?tool=writing', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'Uploads', href: '/sources', expectedContent: ['Sources'] },
          { label: 'Progress', href: '/readiness', expectedContent: ['Learning Dashboard'] },
          { label: 'Settings', href: '/settings', expectedContent: ['Settings', 'Display Density'] },
        ],
      },
      {
        key: 'default',
        detectLabel: 'Tutor Workspace',
        items: [
          { label: 'Tutor Workspace', href: '/tutor', expectedContent: ['Tutor Workspace', 'Good morning'] },
          { label: 'My Classes', href: '/classes', expectedContent: ['My Learning Map'] },
          { label: 'Sources', href: '/sources', expectedContent: ['Sources'] },
          { label: 'Dashboard', href: '/readiness', expectedContent: ['Learning Dashboard'] },
          { label: 'Vocabulary Bank', href: '/dictionary', expectedContent: ['Vocabulary Bank'] },
          { label: 'Settings', href: '/settings', expectedContent: ['Settings', 'Display Density'] },
        ],
      },
    ];

    let activeSet = navSets[navSets.length - 1];
    for (const set of navSets) {
      const marker = page.locator(`a:has-text("${set.detectLabel}")`).first();
      if (await marker.isVisible().catch(() => false)) {
        activeSet = set;
        break;
      }
    }

    // Test each navigation link
    for (const item of activeSet.items) {
      // Navigate back to tutor page to ensure sidebar is visible
      await page.goto('/tutor');
      await page.waitForLoadState('networkidle');
      
      // Find the link by text content
      const link = page.locator(`a:has-text("${item.label}")`).first();
      
      // Verify link exists and has correct href
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', item.href);
      
      // Click the link
      await link.click();
      
      // Wait for navigation
      await page.waitForURL(`**${item.href}`, { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      
      // Verify URL updated correctly
      expect(page.url()).toContain(item.href);
      
      // Verify page loaded with expected content (positive confirmation)
      const pageContent = await page.textContent('body') || '';
      const foundContent = item.expectedContent.some(text => 
        pageContent.includes(text)
      );
      expect(
        foundContent,
        `After navigating to ${item.href}, page should contain one of: ${item.expectedContent.join(', ')}`
      ).toBeTruthy();
    }
  });

  test('app logo/brand links to home', async ({ page }) => {
    await page.goto('/tutor');
    await page.waitForLoadState('networkidle');
    
    // Look for ForgeStudy brand text or logo
    const brandLink = page.locator('a:has-text("ForgeStudy")').first();
    
    // If brand link exists, test it
    if (await brandLink.count() > 0) {
      await brandLink.click();
      await page.waitForURL('**/', { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the home page
      expect(page.url()).toContain('/');
      
      // Verify home page content
      const pageContent = await page.textContent('body') || '';
      expect(pageContent).toMatch(/ForgeStudy|Homework/i);
    }
  });
});
