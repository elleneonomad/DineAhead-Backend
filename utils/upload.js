const multer = require('multer');
const { bucket } = require('../config/firebase');
const path = require('path');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer with size limit (5MB)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * Upload file to Firebase Storage
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Name to save the file as
 * @param {string} folder - Folder path in storage (e.g., 'restaurants', 'menu-items', 'tables')
 * @param {string} mimetype - File mimetype
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadToFirebaseStorage = async (fileBuffer, fileName, folder, mimetype) => {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const uniqueFileName = `${folder}/${baseName}-${timestamp}${ext}`;

    // Create a file reference in Firebase Storage
    const file = bucket.file(uniqueFileName);

    // Upload the file
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimetype,
        metadata: {
          firebaseStorageDownloadTokens: require('crypto').randomBytes(16).toString('hex')
        }
      },
      public: true
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    throw new Error('Failed to upload image to storage');
  }
};

/**
 * Delete file from Firebase Storage
 * @param {string} fileUrl - Public URL of the file to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromFirebaseStorage = async (fileUrl) => {
  try {
    // Extract file path from URL
    const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
    if (!fileUrl.startsWith(baseUrl)) {
      throw new Error('Invalid file URL');
    }

    const filePath = fileUrl.replace(baseUrl, '');
    const file = bucket.file(filePath);

    // Delete the file
    await file.delete();

    return true;
  } catch (error) {
    console.error('Error deleting from Firebase Storage:', error);
    // Don't throw error if file doesn't exist
    if (error.code === 404) {
      return true;
    }
    throw new Error('Failed to delete image from storage');
  }
};

module.exports = {
  upload,
  uploadToFirebaseStorage,
  deleteFromFirebaseStorage
};
