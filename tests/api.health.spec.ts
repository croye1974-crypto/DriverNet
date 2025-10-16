import { test, expect } from '@playwright/test';

test('API health responds 200', async ({ request, baseURL }) => {
  const res = await request.get(new URL('/api/health', baseURL).toString());
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json).toMatchObject({ ok: true });
});
