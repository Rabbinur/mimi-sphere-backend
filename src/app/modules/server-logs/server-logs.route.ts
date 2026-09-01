import express from 'express';
import fs from 'fs';
import path from 'path';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from '../users/user.constant';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/errorHandler';

const router = express.Router();

const getServerLogs = catchAsync(async (req, res) => {
  // Use local date in YYYY-MM-DD format
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
  const type =
    req.query.type === 'error' ? `error-${date}.log` : `combined-${date}.log`;

  const filePath = path.join(process.cwd(), 'logs', type);

  if (!fs.existsSync(filePath)) {
    return res.status(200).json({
      success: true,
      message: 'No log file found',
      data: '',
    });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').slice(-300).join('\n');

  res.status(200).json({
    success: true,
    message: 'Logs fetched successfully',
    data: lines,
  });
});

const getBackupList = catchAsync(async (req, res) => {
  const backupPath = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupPath)) {
    return res.status(200).json({ success: true, data: [] });
  }

  const files = fs
    .readdirSync(backupPath)
    .filter((f) => f.endsWith('.zip'))
    .map((f) => ({
      name: f,
      size:
        (fs.statSync(path.join(backupPath, f)).size / (1024 * 1024)).toFixed(
          2,
        ) + ' MB',
      at: fs.statSync(path.join(backupPath, f)).mtime,
    }))
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  res.status(200).json({ success: true, data: files });
});

const downloadBackup = catchAsync(async (req, res) => {
  const { fileName } = req.query;
  const filePath = path.join(process.cwd(), 'backups', fileName as string);

  if (!fs.existsSync(filePath)) {
    throw new AppError('Backup file not found', 404);
  }

  res.download(filePath);
});

router.get('/', verifyToken([UserRole.ADMIN]), getServerLogs);
router.get('/backups', verifyToken([UserRole.ADMIN]), getBackupList);
router.get('/backups/download', verifyToken([UserRole.ADMIN]), downloadBackup);

export const ServerLogRoutes = router;
