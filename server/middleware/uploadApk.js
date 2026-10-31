const multer = require('multer');

// APKs are reported either as the Android package mime type or as a generic
// binary by different pickers, so accept both and fall back to the extension.
const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  if (mime === 'application/vnd.android.package-archive' || name.endsWith('.apk')) {
    cb(null, true);
  } else {
    cb(new Error('Faili hili si APK. Chagua faili lililoishia na .apk.'), false);
  }
};

const uploadApk = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024 },
});

module.exports = uploadApk;
