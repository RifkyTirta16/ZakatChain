import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ROLES, canAccessPath, itemsForRole, rolesForPath, toRole } from '../src/components/layout/navConfig';
import { ON_CHAIN_NOTE, proofBadge } from '../src/components/ui/badgeStatus';
import { blockchainTone, proofTone } from '../src/utils/status';

test('toRole validates known roles and rejects legacy or unknown role strings', () => {
  for (const role of ALL_ROLES) {
    assert.equal(toRole(role), role);
  }
  assert.equal(toRole('DONOR'), null);
  assert.equal(toRole('SUPERADMIN'), null);
  assert.equal(toRole(undefined), null);
});

test('itemsForRole enforces strict boundary between Muzakki (USER) and Staff/Auditor/Admin', () => {
  assert.deepEqual(itemsForRole(null), []);

  const userPaths = new Set(itemsForRole('USER').map((i) => i.path));
  assert.ok(userPaths.has('/calculator'));
  assert.ok(userPaths.has('/donate'));
  assert.ok(userPaths.has('/my-donations'));
  assert.ok(userPaths.has('/transparency'));
  assert.equal(userPaths.has('/mapping'), false);
  assert.equal(userPaths.has('/mustahik'), false);
  assert.equal(userPaths.has('/audit'), false);
  assert.equal(userPaths.has('/roles'), false);

  for (const staffRole of ['AMIL', 'AUDITOR', 'ADMIN'] as const) {
    const staffPaths = new Set(itemsForRole(staffRole).map((i) => i.path));
    assert.equal(staffPaths.has('/calculator'), false, `${staffRole} should not see muzakki calculator nav`);
    assert.equal(staffPaths.has('/donate'), false, `${staffRole} should not see muzakki donate nav`);
    assert.equal(staffPaths.has('/my-donations'), false, `${staffRole} should not see muzakki donations nav`);
  }

  assert.deepEqual(rolesForPath('/new-record'), ['AMIL', 'ADMIN']);
  assert.deepEqual(rolesForPath('/reconciliation'), ['AUDITOR', 'ADMIN']);
  assert.deepEqual(rolesForPath('/roles'), ['ADMIN']);

  assert.equal(canAccessPath('USER', '/donate?amount=50000'), true);
  assert.equal(canAccessPath('USER', '/roles'), false);
  assert.equal(canAccessPath('USER', '/mapping'), false);
  assert.equal(canAccessPath('ADMIN', '/roles'), true);
  assert.equal(canAccessPath('USER', 'https://evil.example'), false);
  assert.equal(canAccessPath('USER', '//evil.example'), false);
});

test('status badges map documented lifecycle states and uphold blockchain truth invariant', () => {
  assert.equal(proofBadge('CONFIRMED').tone, 'primary');
  assert.equal(proofBadge('CONFIRMED').label, 'Tercatat On-Chain');
  assert.equal(proofBadge('UNKNOWN_CUSTOM_STATE').tone, 'sky');
  assert.match(ON_CHAIN_NOTE, /bukan kebenaran penerima/i);

  assert.equal(blockchainTone('CONFIRMED'), 'success');
  assert.equal(blockchainTone('PENDING_BLOCKCHAIN'), 'warning');
  assert.equal(blockchainTone('REVOKED'), 'neutral');

  assert.equal(proofTone('APPROVED'), 'success');
  assert.equal(proofTone('REJECTED'), 'danger');
  assert.equal(proofTone('PENDING'), 'warning');
});
