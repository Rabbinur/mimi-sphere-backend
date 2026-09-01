import { Router } from 'express';
import { FileController } from './file.controller';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';
import { uploadMiddleware } from '../../middlewares/uploadMiddleware';

const router = Router();

router.get('/proxy', FileController.proxyImage);
router.post('/upload', uploadMiddleware('files', 5), FileController.createFile);
router.post('/upload-from-url', FileController.uploadFileFromUrl);
router.get('/all', FileController.getAllFiles);
router.get('/single/:id', FileController.getFileById);
router.put('/update/:id', FileController.updateFile);
router.delete(
  '/delete/:id',
  verifyToken([UserRole.ADMIN]),
  FileController.deleteFile,
);
// Multiple
router.delete(
  '/delete',
  verifyToken([UserRole.ADMIN]),
  FileController.deleteFiles,
);

export const FileRoutes = router;
