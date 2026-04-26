import { v2 as cloudinary } from 'cloudinary';

import { loadEnv } from '../config/env.js';

const env = loadEnv();

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadAvatarBuffer(
  fileBuffer: Buffer,
  userId: string
): Promise<string> {
  const uploaded = await uploadImageBuffer(fileBuffer, {
    folderSuffix: '',
    publicId: `avatar-${userId}-${Date.now()}`,
    overwrite: true,
  });
  return uploaded.secureUrl;
}

/** Ảnh garment — thư mục con `garments` dưới `CLOUDINARY_FOLDER_NAME` */
export async function uploadGarmentImageBuffer(
  fileBuffer: Buffer,
  userId: string
): Promise<string> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const uploaded = await uploadImageBuffer(fileBuffer, {
    folderSuffix: 'garments',
    publicId: `${userId}-${suffix}`,
    overwrite: false,
  });
  return buildNoBackgroundUrl(uploaded.publicId);
}

async function uploadImageBuffer(
  fileBuffer: Buffer,
  opts: { folderSuffix: string; publicId: string; overwrite: boolean }
): Promise<{ secureUrl: string; publicId: string }> {
  const folder =
    opts.folderSuffix.length > 0
      ? `${env.CLOUDINARY_FOLDER_NAME}/${opts.folderSuffix}`
      : env.CLOUDINARY_FOLDER_NAME;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: opts.publicId,
        overwrite: opts.overwrite,
      },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(fileBuffer);
  });
}

function buildNoBackgroundUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'image',
    transformation: [{ effect: 'background_removal' }],
  });
}
