import multer from 'multer';

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

function createImageUploadMiddleware(maxFileSizeMb: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      cb(null, imageMimeTypes.includes(file.mimetype));
    },
  });
}

export const uploadAvatarMiddleware = createImageUploadMiddleware(2);
export const uploadGarmentMiddleware = createImageUploadMiddleware(10);
