import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { detectFileType, persistUpload, removeUpload, uploadDirectory, MAX_UPLOAD_BYTES } from '../middleware/upload.js';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PDF_HEADER = Buffer.from('%PDF-1.7\n', 'latin1');

const asUpload = (buffer: Buffer, originalname = 'x.png', mimetype = 'image/png') =>
  ({ buffer, originalname, mimetype, fieldname: 'proof_file' }) as Express.Multer.File;

test('detectFileType identifies supported formats from content', () => {
  assert.equal(detectFileType(PNG_HEADER)?.mime, 'image/png');
  assert.equal(detectFileType(JPEG_HEADER)?.mime, 'image/jpeg');
  assert.equal(detectFileType(PDF_HEADER)?.mime, 'application/pdf');
});

test('detectFileType rejects content that only claims to be an image', () => {
  // A script/HTML payload announcing itself as image/png must not pass.
  const fake = Buffer.from('<script>alert(1)</script>');
  assert.equal(detectFileType(fake), undefined);

  const html = Buffer.from('<!DOCTYPE html><html></html>');
  assert.equal(detectFileType(html), undefined);
  assert.equal(detectFileType(Buffer.alloc(0)), undefined);
});

test('persistUpload stores a valid image with a generated name and real extension', () => {
  const persisted = persistUpload(asUpload(PDF_HEADER, 'proof.png', 'image/png'));
  assert.ok(persisted);
  if (!persisted) return;
  try {
    assert.match(persisted.filename, /^[a-f0-9]{32}\.pdf$/);
    assert.notEqual(persisted.filename, 'proof.png');
    assert.ok(fs.existsSync(persisted.path));
    assert.equal(persisted.mime, 'application/pdf');
    assert.equal(persisted.size, PDF_HEADER.length);
    assert.match(persisted.sha256, /^[a-f0-9]{64}$/);
    // The stored name must not escape the uploads directory.
    assert.ok(persisted.path.startsWith(uploadDirectory));
  } finally {
    removeUpload(persisted.path);
  }
});

test('persistUpload refuses to write unrecognised content', () => {
  const before = fs.readdirSync(uploadDirectory).length;
  const persisted = persistUpload(asUpload(Buffer.from('not an image'), 'evil.png', 'image/png'));
  assert.equal(persisted, null);
  assert.equal(fs.readdirSync(uploadDirectory).length, before);
});

test('persistUpload neutralises path traversal in the original filename', () => {
  const persisted = persistUpload(asUpload(PNG_HEADER, '../../../../etc/passwd.png', 'image/png'));
  assert.ok(persisted);
  if (!persisted) return;
  try {
    assert.ok(persisted.path.startsWith(uploadDirectory));
    assert.equal(persisted.filename.includes('/'), false);
    assert.equal(persisted.filename.includes('..'), false);
  } finally {
    removeUpload(persisted.path);
  }
});

test('per-file upload limit is 5 MB', () => {
  assert.equal(MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
});
