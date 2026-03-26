import { test, expect, request as pwRequest } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.describe('Integration Webhook Tests', () => {
  let publicCtx: any;

  test.beforeAll(async () => {
    publicCtx = await pwRequest.newContext();
  });

  test.afterAll(async () => {
    if (publicCtx) await publicCtx.dispose();
  });

  // INT-01: Zalo verify — wrong token
  test('INT-01: Zalo verify wrong token returns 403', async () => {
    const res = await publicCtx.get(
      '/integrations/zalo/webhook?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=wrong',
    );
    expect(res.status()).toBe(403);
  });

  // INT-02: Zalo verify — correct (empty) token
  test('INT-02: Zalo verify correct empty token returns 200 with challenge', async () => {
    const res = await publicCtx.get(
      '/integrations/zalo/webhook?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=',
    );
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toBe('abc');
  });

  // INT-03: Zalo inbound event
  test('INT-03: Zalo inbound event returns 200', async () => {
    const res = await publicCtx.post('/integrations/zalo/webhook', {
      data: {
        event: 'user_send_text',
        from: 'user123',
        content: 'hello',
      },
    });
    expect(res.status()).toBe(200);
  });

  // INT-04: Messenger verify — wrong token
  test('INT-04: Messenger verify wrong token returns 403', async () => {
    const res = await publicCtx.get(
      '/integrations/messenger/webhook?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=wrong',
    );
    expect(res.status()).toBe(403);
  });

  // INT-05: Messenger verify — correct (empty) token
  test('INT-05: Messenger verify correct empty token returns 200 with challenge', async () => {
    const res = await publicCtx.get(
      '/integrations/messenger/webhook?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=',
    );
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toBe('abc');
  });

  // INT-06: Messenger inbound event
  test('INT-06: Messenger inbound event returns 200', async () => {
    const res = await publicCtx.post('/integrations/messenger/webhook', {
      data: {
        object: 'page',
        entry: [
          {
            id: 'PAGE_ID',
            time: 1234567890,
            messaging: [
              {
                sender: { id: 'user123' },
                recipient: { id: 'PAGE_ID' },
                message: { text: 'hello' },
              },
            ],
          },
        ],
      },
    });
    expect(res.status()).toBe(200);
  });
});
