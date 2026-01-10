import { test, expect } from '@playwright/test';

/**
 * Navigation Smoke Tests for ForgeNursing
 * 
 * These tests verify that all critical routes are reachable by checking for
 * positive confirmations of correct page content, rather than absence of error text.
 * Run with: npm run test:smoke
 */

// Route-to-content mapping for positive assertions
const ROUTE_CONTENT_MAP: Record<string, string[]> = {
  '/': ['ForgeNursing', 'Master Clinical Reasoning'],
  '/tutor': ['Clinical Tutor'],
  '/binder': ['My Clinical Binder'],
  '/readiness': ['Readiness', 'Score'],
  '/clinical-desk': ['Shift Report', 'Quick Start'],
  '/settings': ['Settings', 'Display Density'],
  '/login': ['Welcome Back', 'Enter your credentials'],
  '/signup': ['Create Account', 'Sign Up'],
  '/privacy': ['Privacy', 'Privacy Policy'],
  '/terms': ['Terms', 'Terms of Service'],
};

// Critical routes that must be accessible
const CRITICAL_ROUTES = [
  '/',
  '/tutor',
  '/binder',
  '/readiness',
  '/clinical-desk',
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

test.describe('Navigation Smoke Tests', () => {
  test('all critical routes return 200 and show expected content', async ({ page }) => {
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
        expect(foundContent).toBeTruthy(
          `Route ${route} should contain one of: ${expectedContent.join(', ')}`
        );
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
        expect(foundContent).toBeTruthy(
          `Route ${route} should contain one of: ${expectedContent.join(', ')}`
        );
      }
    }
  });

  test('sidebar navigation links work correctly', async ({ page }) => {
    // Navigate to a page with sidebar (any authenticated route)
    await page.goto('/tutor');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the tutor page
    const tutorContent = await page.textContent('body') || '';
    expect(tutorContent).toContain('Clinical Tutor');
    
    // Wait for sidebar to be visible (desktop only)
    const sidebar = page.locator('aside');
    const isSidebarVisible = await sidebar.isVisible().catch(() => false);
    
    if (!isSidebarVisible) {
      // Sidebar might be hidden on mobile, skip this test
      test.skip();
      return;
    }

    // Define expected navigation items from Sidebar component
    const navItems = [
      { label: 'Clinical Desk', href: '/clinical-desk', expectedContent: ['Shift Report', 'Quick Start'] },
      { label: 'Tutor', href: '/tutor', expectedContent: ['Clinical Tutor'] },
      { label: 'My Clinical Binder', href: '/binder', expectedContent: ['My Clinical Binder'] },
      { label: 'Readiness', href: '/readiness', expectedContent: ['Readiness', 'Score'] },
      { label: 'Settings', href: '/settings', expectedContent: ['Settings', 'Display Density'] },
    ];

    // Test each navigation link
    for (const item of navItems) {
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
      expect(foundContent).toBeTruthy(
        `After navigating to ${item.href}, page should contain one of: ${item.expectedContent.join(', ')}`
      );
    }
  });

  test('app logo/brand links to home', async ({ page }) => {
    await page.goto('/tutor');
    await page.waitForLoadState('networkidle');
    
    // Look for ForgeNursing brand text or logo
    const brandLink = page.locator('a:has-text("ForgeNursing")').first();
    
    // If brand link exists, test it
    if (await brandLink.count() > 0) {
      await brandLink.click();
      await page.waitForURL('**/', { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the home page
      expect(page.url()).toContain('/');
      
      // Verify home page content
      const pageContent = await page.textContent('body') || '';
      expect(pageContent).toMatch(/ForgeNursing|Master Clinical Reasoning/i);
    }
  });
});
