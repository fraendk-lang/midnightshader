/**
 * E2E-Smoke. Einmal lokal: `npx playwright install` (Browser-Binaries).
 * Dev-Server: Port 5199 (siehe playwright.config.ts), kollidiert nicht mit 5183.
 */
import { expect, test } from '@playwright/test'

test.describe('MidnightShader smoke', () => {
  test('Startseite lädt', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Obsidian/i })).toBeVisible()
  })

  test('Galerie und Preset-Link', async ({ page }) => {
    await page.goto('/gallery')
    await expect(page.getByRole('heading', { name: 'Shader-Galerie' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Im Editor laden' }).first()).toBeVisible()
  })

  test('Editor mit Preset-Query', async ({ page }) => {
    await page.goto('/editor?preset=obsidian-flux')
    await expect(page.getByRole('heading', { name: 'Shader-Designer' })).toBeVisible()
    await expect(page).toHaveURL(/\/editor$/)
  })

  test('Node Graph lädt', async ({ page }) => {
    await page.goto('/node-graph')
    await expect(page.getByRole('heading', { name: 'Node Graph' })).toBeVisible()
    await expect(page.getByText(/Graph vs\. Galerie-Presets/i)).toBeVisible()
  })
})
