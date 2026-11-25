const multer = require('multer');

const storage = multer.memoryStorage();

const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const documentTypes = [...imageTypes, 'application/pdf'];

const fileFilter = (req, file, cb) => {
  if (imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Aina ya faili hii haikubaliki. Tumia jpg, png, gif, au webp.'), false);
  }
};

const documentFilter = (req, file, cb) => {
  if (documentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nyaraka lazima ziwe pdf, jpg, png, gif au webp.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// KYC paperwork is often scanned PDFs, so it gets its own larger limit and
// MIME allow-list instead of loosening the image upload used everywhere else.
const documentUpload = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
module.exports.documentUpload = documentUpload;
