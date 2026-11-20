import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { initDb } from '../models/db.js';
import { register, login } from '../controllers/authController.js';
import { authenticate, authorize, authorizeSelfOr, type AuthRequest } from '../middleware/auth.js';
import { getDonorHistory } from '../controllers/donationController.js';

function mockResponse() {
  const result = { statusCode: 200, body: undefined as unknown };
  const response = {
    status(code: number) { result.statusCode = code; return response; },
    json(body: unknown) { result.body = body; return response; },
  };
  return { response: response as unknown as Response, result };
}

type Db = Awaited<ReturnType<typeof initDb>>;
const req = (db: Db, overrides: Record<string, unknown> = {}) =>
  ({ db, body: {}, params: {}, headers: {}, ...overrides } as unknown as Request);

const withSecret = async (secret: string | undefined, run: () => Promise<void>) => {
  const previous = process.env.JWT_SECRET;
  if (secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = secret;
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
};

test('register hashes the password and never stores it in plain text', async () => {
  const db = await initDb(':memory:');
  try {
    const response = mockResponse();
    await register(req(db, { body: { username: '  amil01  ', password: 'supersecret1' } }), response.response);
    assert.equal(response.result.statusCode, 201);

    const user = await db.get('SELECT username, password, role FROM users WHERE id = 1');
    assert.equal(user.username, 'amil01');
    assert.equal(user.role, 'USER');
    assert.notEqual(user.password, 'supersecret1');
    assert.match(user.password, /^\$2[aby]\$/);
  } finally {
    await db.close();
  }
});

test('register rejects weak passwords, short usernames and duplicates', async () => {
  const db = await initDb(':memory:');
  try {
    for (const body of [
      { username: 'ab', password: 'supersecret1' },
      { username: 'validname', password: 'short' },
      { username: 'bad name!', password: 'supersecret1' },
      { username: 'validname' },
    ]) {
      const response = mockResponse();
      await register(req(db, { body }), response.response);
      assert.equal(response.result.statusCode, 400, JSON.stringify(body));
    }

    const first = mockResponse();
    await register(req(db, { body: { username: 'dup', password: 'supersecret1' } }), first.response);
    assert.equal(first.result.statusCode, 201);

    const duplicate = mockResponse();
    await register(req(db, { body: { username: 'dup', password: 'supersecret1' } }), duplicate.response);
    assert.equal(duplicate.result.statusCode, 400);
    assert.equal((await db.get('SELECT COUNT(*) as total FROM users')).total, 1);
  } finally {
    await db.close();
  }
});

test('login issues a token for valid credentials and rejects invalid ones uniformly', async () => {
  await withSecret('test-jwt-secret', async () => {
    const db = await initDb(':memory:');
    try {
      await register(req(db, { body: { username: 'amil01', password: 'supersecret1' } }), mockResponse().response);

      const ok = mockResponse();
      await login(req(db, { body: { username: 'amil01', password: 'supersecret1' } }), ok.response);
      assert.equal(ok.result.statusCode, 200);
      const body = ok.result.body as any;
      assert.ok(body.token);
      assert.equal(body.user.username, 'amil01');
      assert.equal(body.user.password, undefined, 'the password hash must never be returned');

      const decoded = jwt.verify(body.token, 'test-jwt-secret') as any;
      assert.equal(decoded.username, 'amil01');
      assert.equal(decoded.role, 'USER');

      // Unknown user and wrong password return the same response.
      const unknown = mockResponse();
      await login(req(db, { body: { username: 'nobody', password: 'supersecret1' } }), unknown.response);
      const wrong = mockResponse();
      await login(req(db, { body: { username: 'amil01', password: 'wrongpassword' } }), wrong.response);
      assert.equal(unknown.result.statusCode, 401);
      assert.equal(wrong.result.statusCode, 401);
      assert.deepEqual(unknown.result.body, wrong.result.body);
    } finally {
      await db.close();
    }
  });
});

test('login reports 503 when no JWT secret is configured', async () => {
  await withSecret(undefined, async () => {
    const db = await initDb(':memory:');
    try {
      const response = mockResponse();
      await login(req(db, { body: { username: 'a', password: 'b' } }), response.response);
      assert.equal(response.result.statusCode, 503);
    } finally {
      await db.close();
    }
  });
});

const callMiddleware = (
  middleware: (req: AuthRequest, res: Response, next: NextFunction) => unknown,
  request: AuthRequest
) => {
  let nextCalled = false;
  const { response, result } = mockResponse();
  middleware(request, response, () => { nextCalled = true; });
  return { result, nextCalled };
};

test('authenticate rejects missing, malformed and unverifiable tokens', async () => {
  await withSecret('test-jwt-secret', async () => {
    for (const headers of [{}, { authorization: 'Token abc' }, { authorization: 'Bearer ' }]) {
      const { result, nextCalled } = callMiddleware(authenticate, { headers } as AuthRequest);
      assert.equal(result.statusCode, 401, JSON.stringify(headers));
      assert.equal(nextCalled, false);
    }

    const badSignature = jwt.sign({ id: 1, username: 'a', role: 'USER' }, 'a-different-secret');
    const { result } = callMiddleware(authenticate, { headers: { authorization: `Bearer ${badSignature}` } } as AuthRequest);
    assert.equal(result.statusCode, 401);

    const expired = jwt.sign({ id: 1, username: 'a', role: 'USER' }, 'test-jwt-secret', { expiresIn: '-1s' });
    const expiredResult = callMiddleware(authenticate, { headers: { authorization: `Bearer ${expired}` } } as AuthRequest);
    assert.equal(expiredResult.result.statusCode, 401);
  });
});

test('authenticate rejects a validly signed token with an unusable payload shape', async () => {
  await withSecret('test-jwt-secret', async () => {
    const token = jwt.sign({ name: 'no-id-or-role' }, 'test-jwt-secret');
    const { result, nextCalled } = callMiddleware(authenticate, { headers: { authorization: `Bearer ${token}` } } as AuthRequest);
    assert.equal(result.statusCode, 401);
    assert.equal(nextCalled, false);
  });
});

test('authenticate accepts a well-formed token and exposes the identity', async () => {
  await withSecret('test-jwt-secret', async () => {
    const token = jwt.sign({ id: 5, username: 'auditor', role: 'AUDITOR' }, 'test-jwt-secret', { expiresIn: '1h' });
    const request = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const { result, nextCalled } = callMiddleware(authenticate, request);
    assert.equal(nextCalled, true);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(request.user, { id: 5, username: 'auditor', role: 'AUDITOR' });
  });
});

test('authorize enforces the role allowlist', () => {
  const admin = { user: { id: 1, username: 'a', role: 'ADMIN' } } as AuthRequest;
  const donor = { user: { id: 2, username: 'd', role: 'USER' } } as AuthRequest;

  assert.equal(callMiddleware(authorize(['ADMIN']), admin).nextCalled, true);
  assert.equal(callMiddleware(authorize(['ADMIN']), donor).result.statusCode, 403);
  assert.equal(callMiddleware(authorize(['ADMIN']), { } as AuthRequest).result.statusCode, 403);
});

test('authorizeSelfOr permits the owner and privileged roles only', () => {
  const donor = { user: { id: 7, username: 'd', role: 'USER' }, params: { donor_id: '7' } } as unknown as AuthRequest;
  const otherDonor = { user: { id: 8, username: 'e', role: 'USER' }, params: { donor_id: '7' } } as unknown as AuthRequest;
  const admin = { user: { id: 1, username: 'a', role: 'ADMIN' }, params: { donor_id: '7' } } as unknown as AuthRequest;

  assert.equal(callMiddleware(authorizeSelfOr(['ADMIN', 'AUDITOR'], 'donor_id'), donor).nextCalled, true);
  assert.equal(callMiddleware(authorizeSelfOr(['ADMIN', 'AUDITOR'], 'donor_id'), otherDonor).result.statusCode, 403);
  assert.equal(callMiddleware(authorizeSelfOr(['ADMIN', 'AUDITOR'], 'donor_id'), admin).nextCalled, true);
});

test('GET /api/donations/donor/:id rejects a non-numeric id', async () => {
  const db = await initDb(':memory:');
  try {
    const response = mockResponse();
    await getDonorHistory(req(db, { params: { donor_id: 'abc' } }), response.response);
    assert.equal(response.result.statusCode, 400);
  } finally {
    await db.close();
  }
});
