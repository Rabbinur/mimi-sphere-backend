import { Request, Response } from 'express';
import { fileServices } from './file.service';
import { fileValidationSchema } from './file.validation';
import { uploadToCloudinary, uploadToS3 } from '../../middlewares/uploadMiddleware';
import axios from 'axios';

export const FileController = {
  createFile: async (req: Request, res: Response) => {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // If multer.fields() used, req.files is an object, else array (for .array())
      let files: Express.Multer.File[] = [];
      if (Array.isArray(req.files)) {
        files = req.files;
      } else {
        files = Object.values(req.files).flat();
      }

      // Upload each file to Cloudinary and save to DB
      const uploadedFilesData = await Promise.all(
        files.map(async (file) => {
          const uploadedFile = await uploadToCloudinary(file);
          const fileDoc = await fileServices.createFile({
            ...uploadedFile,
            title: file.originalname,
          });
          return fileDoc;
        }),
      );

      res.status(201).json({
        message: 'Files uploaded successfully',
        files: uploadedFilesData,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  uploadFileFromUrl: async (req: Request, res: Response) => {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ message: 'fileUrl is required' });
    }

    try {
      // Step 1: Download file from URL
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      const contentType = response.headers['content-type'];
      const buffer = Buffer.from(response.data);

      const urlParts = fileUrl.split('/');
      const originalName =
        urlParts[urlParts.length - 1].split('?')[0] || 'file';

      // Step 2: Create Multer file object
      const fakeFile: Express.Multer.File = {
        fieldname: 'fileUrlUpload',
        originalname: originalName,
        encoding: '7bit',
        mimetype: contentType as string,
        size: buffer.length,
        buffer,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      // Step 3: Upload to Cloudinary
      const uploadedFile = await uploadToCloudinary(fakeFile);

      // Step 4: Save to Database
      const fileDoc = await fileServices.createFile({
        ...uploadedFile,
        title: originalName,
      });

      return res.status(201).json({
        message: 'File uploaded successfully from URL',
        file: fileDoc,
      });
    } catch (error: any) {
      console.error('Error uploading file from URL:', error);
      return res
        .status(500)
        .json({
          message: 'Failed to upload file from URL',
          error: error.message,
        });
    }
  },

  getAllFiles: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const files = await fileServices.getAllFiles(search, page, limit);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getFileById: async (req: Request, res: Response) => {
    try {
      const file = await fileServices.getFileById(req.params.id);
      res.json(file);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  },

  updateFile: async (req: Request, res: Response) => {
    try {
      const updateData = req.body;
      const updatedFile = await fileServices.updateFile(
        req.params.id,
        updateData,
      );
      res.json({ message: 'File updated successfully', updatedFile });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteFile: async (req: Request, res: Response) => {
    try {
      const deletedFile = await fileServices.deleteFile(req.params.id);
      res.json({ message: 'File deleted successfully', deletedFile });
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  },
  // controllers/FileController.ts
  deleteFiles: async (req: Request, res: Response) => {
    try {
      const { ids } = req.body; // Expecting { ids: string[] }

      // Validate input
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: 'Invalid request: No file IDs provided',
        });
      }

      const deletedFiles = await fileServices.deleteFiles(ids);

      return res.status(200).json({
        status: 200,
        success: true,
        message: `${deletedFiles.length} file(s) deleted successfully`,
        count: deletedFiles.length,
        deletedFiles,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 500,
        success: false,
        message: 'An error occurred while deleting files',
        error: error.message,
      });
    }
  },

  proxyImage: async (req: Request, res: Response) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send('URL is required');
    }

    try {
      const response = await axios.get(decodeURIComponent(url as string), {
        responseType: 'stream',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
          Referer: 'https://www.1688.com/',
        },
      });

      res.setHeader(
        'Content-Type',
        (response.headers['content-type'] as string) || 'image/jpeg',
      );
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      response.data.pipe(res);
    } catch (error: any) {
      console.error('Proxy Error:', error.message ?? error);
      res.status(500).send('Failed to proxy image');
    }
  },
};
