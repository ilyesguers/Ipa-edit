const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, adminOnly } = require('../../middlewares/auth');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// File type is decided by magic bytes, NEVER by the client-supplied mimetype
// or extension.
const MAGIC_TYPES = [
  { type: 'png', ext: '.png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'jpeg', ext: '.jpg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'gif', ext: '.gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: 'webp', ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46] } // RIFF….WEBP
];

const detectImageType = (filePath) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    for (const t of MAGIC_TYPES) {
      if (t.bytes.every((b, i) => head[i] === b)) {
        if (t.type === 'webp' && head.toString('ascii', 8, 12) !== 'WEBP') continue;
        return t;
      }
    }
  } catch (_) { /* fall through */ }
  return null;
};

// Detect HEIC/HEIF by magic bytes: ftyp followed by heic/heix/hevx/mif1
const isHeicFile = (filePath) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const head = Buffer.alloc(32);
    fs.readSync(fd, head, 0, 32, 0);
    fs.closeSync(fd);
    // Check for ftyp box at offset 4
    const ftyp = head.toString('ascii', 4, 8);
    if (ftyp !== 'ftyp') return false;
    const brand = head.toString('ascii', 8, 12).toLowerCase();
    return ['heic', 'heix', 'hevx', 'mif1', 'heim', 'heis', 'avic'].some(b => brand.includes(b));
  } catch (_) { return false; }
};

// Convert HEIC to JPEG using sharp (falls back gracefully)
const convertHeicToJpeg = async (inputPath) => {
  try {
    const sharp = require('sharp');
    const jpegBuffer = await sharp(inputPath)
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return jpegBuffer;
  } catch (err) {
    // sharp not installed or conversion failed
    return null;
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  }
});

// Permissive filter — real validation is done by magic bytes below.
// iOS sends HEIC/HEIF with various mimetypes; we accept everything and
// validate the actual file content after upload.
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
    'application/octet-stream']; // iOS sometimes sends octet-stream for photos
  if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB to accommodate HEIC

router.post('/image', authMiddleware, adminOnly, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  // iPhone HEIC/HEIF detection and conversion
  if (isHeicFile(req.file.path)) {
    const jpegBuffer = await convertHeicToJpeg(req.file.path);
    if (jpegBuffer) {
      // Write converted JPEG
      const jpegName = req.file.filename.replace(/\.tmp$/, '') + '.jpg';
      const jpegPath = path.join(uploadDir, jpegName);
      fs.writeFileSync(jpegPath, jpegBuffer);
      fs.unlink(req.file.path, () => {});
      const base = (process.env.BASE_URL || '').replace(/\/$/, '');
      return res.json({
        success: true,
        url: `${base}/uploads/${jpegName}`,
        note: 'HEIC converted to JPEG automatically'
      });
    } else {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        error: 'صيغة HEIC غير مدعومة حالياً — حوّل الصورة إلى JPEG/PNG من إعدادات الكاميرا في iPhone (الإعدادات > الكاميرا > التنسيقات > الأكثر توافقاً)'
      });
    }
  }

  const detected = detectImageType(req.file.path);
  if (!detected) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, error: 'الملف ليس صورة صالحة / Invalid image file' });
  }
  const finalName = `${req.file.filename.replace(/\.tmp$/, '')}${detected.ext}`;
  const finalPath = path.join(uploadDir, finalName);
  try {
    fs.renameSync(req.file.path, finalPath);
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
  const base = (process.env.BASE_URL || '').replace(/\/$/, '');
  res.json({ success: true, url: `${base}/uploads/${finalName}` });
});

// Import keys from txt file
router.post('/keys-file', authMiddleware, adminOnly, multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }).single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const content = req.file.buffer.toString('utf-8');
  const keys = content.split('\n').map(k => k.trim()).filter(k => k.length > 0);
  res.json({ success: true, keys, count: keys.length });
});

// ── Media Library ───────────────────────────────────────────────────────────
// List every uploaded image (admin only) — used by the Media Manager page.
// Sorted newest-first so the most recent uploads are always visible on top.
router.get('/list', authMiddleware, adminOnly, (req, res) => {
  try {
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    const files = fs.readdirSync(uploadDir)
      .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
      .map((filename) => {
        const stat = fs.statSync(path.join(uploadDir, filename));
        return {
          filename,
          url: `${base}/uploads/${filename}`,
          size: stat.size,
          modified: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete an uploaded image (admin only). Basename guards against path traversal.
router.delete('/:filename', authMiddleware, adminOnly, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!filename || filename.includes('..') || !/\.(png|jpe?g|webp|gif)$/i.test(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    const file = path.join(uploadDir, filename);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    fs.unlinkSync(file);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
