
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const resolveUploadDirectory = () => {
  if (process.env.UPLOAD_DIR?.trim()) {
    return path.resolve(process.env.UPLOAD_DIR.trim());
  }
  if (process.env.NODE_ENV === 'test') {
    return path.join(os.tmpdir(), 'zakatchain-test-uploads');
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
};

const uploadDirectory = resolveUploadDirectory();
fs.mkdirSync(uploadDirectory, { recursive: true });

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Magic-byte signatures. A client-declared MIME type is untrusted, so the real
 * file type is determined from the file header and the stored extension is
 * derived from that decision rather than from the attacker-controlled
 * `originalname`. This prevents serving an uploaded script/HTML as .png.
 */
const SIGNATURES: { mime: string; ext: string; test: (buffer: Buffer) => boolean }[] = [
  {
    mime: 'image/jpeg',
    ext: '.jpg',
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: '.png',
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'application/pdf',
    ext: '.pdf',
    test: (b) => b.length > 4 && b.subarray(0, 5).toString('latin1') === '%PDF-',
  },
];

export const detectFileType = (buffer: Buffer) => SIGNATURES.find((entry) => entry.test(buffer));

/**
 * Buffers the upload in memory so the file header can be inspected before
 * anything is written to disk. Files that fail the signature check never
 * touch the filesystem.
 */
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 1024 * 100,
  },
  fileFilter: (_req, file, cb) => {
    // Coarse gate only; the authoritative check is the magic-byte inspection
    // in persistUpload below.
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format berkas tidak didukung. Gunakan JPG, PNG, atau PDF.'));
    }
  },
});

export interface PersistedUpload {
  filename: string;
  path: string;
  mime: string;
  size: number;
  sha256: string;
}

/**
 * Validates the buffered upload by content and writes it to the uploads
 * directory under a randomly generated, extension-safe name.
 * Returns null when the buffer is not a supported file type.
 */
export const persistUpload = (file: Express.Multer.File): PersistedUpload | null => {
  const detected = detectFileType(file.buffer);
  if (!detected) return null;

  const filename = `${crypto.randomBytes(16).toString('hex')}${detected.ext}`;
  const destination = path.join(uploadDirectory, filename);

  // Defence in depth: confirm the resolved path stays inside uploadDirectory.
  if (path.dirname(path.resolve(destination)) !== path.resolve(uploadDirectory)) {
    return null;
  }

  fs.writeFileSync(destination, file.buffer, { mode: 0o640 });

  return {
    filename,
    path: destination,
    mime: detected.mime,
    size: file.buffer.length,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex'),
  };
};

export const removeUpload = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('[UPLOAD CLEANUP ERROR]', error);
  }
};

export { uploadDirectory };
