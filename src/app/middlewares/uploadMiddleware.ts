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
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  cb(null, allowedTypes.includes(file.mimetype));
};

// Upload middleware
export const uploadMiddleware = (fieldNames: string | string[], maxCount?: number) => {
  if (Array.isArray(fieldNames)) {
    return multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter
    }).fields(fieldNames.map(name => ({ name, maxCount: maxCount || 1 })));
  } else {
    return multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter
    }).array(fieldNames, maxCount || 4);
  }
};

// Upload to S3
// export const uploadToS3 = async (file: Express.Multer.File) => {
//   const sanitizedFilename = file.originalname.replace(/\s+/g, '-');
//   const key = `uploads/${Date.now()}-${sanitizedFilename}`;

//   const params = {
//     Bucket: config.aws.bucket,
//     Key: key,
//     Body: file.buffer,
//     ContentType: file.mimetype
//   };

//   try {
//     await s3Client.send(new PutObjectCommand(params));
//     return {
//       url: `${config.aws.file_load_base}${key}`,
//       key,
//       size: file.size,
//       mimetype: file.mimetype
//     };
//   } catch (error: any) {
//     console.error('S3 upload error:', error);
//     throw new Error(`Failed to upload file: ${error.message}`);
//   }
// };
export const uploadToS3 = async (file: Express.Multer.File) => {
  let buffer = file.buffer;
  let mimetype = file.mimetype;
  const isImage = mimetype.startsWith('image/');

  if (isImage) {
    buffer = await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true })  // max width 800px (change korte paro)
      .webp({ quality: 75 })  // WebP convert and quality 75%
      .toBuffer();
    mimetype = 'image/webp';  // mime type update koro
  }

  // Original file name theke extension remove kore .webp add koro
  const sanitizedFilename = file.originalname.replace(/\s+/g, '-').replace(/\.[^/.]+$/, '') + '.webp';
  const key = `uploads/${Date.now()}-${sanitizedFilename}`;

  const params = {
    Bucket: config.aws.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    return {
      url: `${config.aws.file_load_base}${key}`,
      key,
      size: buffer.length,
      mimetype
    };
  } catch (error: any) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

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

