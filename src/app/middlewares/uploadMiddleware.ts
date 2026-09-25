import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { Request, Express } from 'express';
import config from '../config';
import sharp from 'sharp';


const s3Client = new S3Client({
  region: config.aws.region,  // Use region from config
  credentials: {
    accessKeyId: config.aws.access_key_id,  // Use AWS Access Key from config
    secretAccessKey: config.aws.secret_access_key,  // Use AWS Secret Key from config
  },
  forcePathStyle: config.aws.use_path_style_endpoint,  // Use path style endpoint config from .env
});

// Multer setup
const storage = multer.memoryStorage();
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isImage = file.mimetype.startsWith('image/');
  const isDoc = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ].includes(file.mimetype);

  if (isImage || isDoc) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Upload middleware
export const uploadMiddleware = (fieldNames?: string | string[], maxCount?: number) => {
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter,
  });

  if (!fieldNames) {
    return upload.any();
  }
  if (Array.isArray(fieldNames)) {
    return upload.fields(fieldNames.map(name => ({ name, maxCount: maxCount || 10 })));
  }
  return upload.any();
};

// Upload to S3
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// Upload to Cloudinary (Active)
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder = 'mimisphere/uploads'
) => {
  let buffer = file.buffer;
  let mimetype = file.mimetype;
  const isImage = mimetype.startsWith('image/');

  if (isImage) {
    try {
      buffer = await sharp(file.buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      mimetype = 'image/webp';
    } catch (sharpErr) {
      console.warn('Sharp compression warning:', sharpErr);
      buffer = file.buffer;
    }
  }

  const sanitizedFilename = file.originalname
    .replace(/\s+/g, '-')
    .replace(/\.[^/.]+$/, '');

  return new Promise<{
    url: string;
    key: string;
    size: number;
    mimetype: string;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${Date.now()}-${sanitizedFilename}`,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          console.error('Cloudinary upload error:', error);
          return reject(
            new Error(
              `Failed to upload file to Cloudinary: ${error?.message || 'Unknown error'}`
            )
          );
        }
        resolve({
          url: result.secure_url || result.url,
          key: result.public_id,
          size: result.bytes || buffer.length,
          mimetype,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

// Upload to S3 (Preserved for future AWS usage)
export const uploadToS3 = async (file: Express.Multer.File) => {
  let buffer = file.buffer;
  let mimetype = file.mimetype;
  const isImage = mimetype.startsWith('image/');

  if (isImage) {
    buffer = await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    mimetype = 'image/webp';
  }

  const sanitizedFilename =
    file.originalname.replace(/\s+/g, '-').replace(/\.[^/.]+$/, '') + '.webp';
  const key = `uploads/${Date.now()}-${sanitizedFilename}`;

  const params = {
    Bucket: config.aws.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    return {
      url: `${config.aws.file_load_base}${key}`,
      key,
      size: buffer.length,
      mimetype,
    };
  } catch (error: any) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

// Extend Express Request
declare module 'express' {
  interface Request {
    uploadedFiles?: Array<{
      url: string;
      key: string;
      size: number;
      mimetype: string;
      fieldname: string;
    }>;
  }
}

