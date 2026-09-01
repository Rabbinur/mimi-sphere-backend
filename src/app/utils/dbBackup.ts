import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import AdmZip from 'adm-zip';
import { sendEmail } from './sendEmail';
import logger from './logger';
import dotenv from 'dotenv';

dotenv.config();

export const runDatabaseBackup = async () => {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;

  const backupPath = path.join(process.cwd(), 'backups');
  const fileName = `db-backup-${date}.json`;
  const zipName = `db-backup-${date}.zip`;

  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath);
  }

  try {
    logger.info('🚀 Starting Database Backup...');

    // 1. Fetch all collections
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const backupData: Record<string, any[]> = {};

    for (const collection of collections) {
      const data = await mongoose.connection.db
        .collection(collection.name)
        .find({})
        .toArray();
      backupData[collection.name] = data;
    }

    // 2. Save to JSON
    const jsonPath = path.join(backupPath, fileName);
    fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2));

    // 3. Zip the JSON
    const zip = new AdmZip();
    zip.addLocalFile(jsonPath);
    const zipPath = path.join(backupPath, zipName);
    zip.writeZip(zipPath);

    // 4. Send Email via exact Invoice system logic
    await sendEmail(
      'slsuyel@gmail.com',
      `📦 Database Backup - ${date}`,
      `Please find the database backup attached for ${date}.`,
      `<p>Database backup for <b>${date}</b> is ready.</p>`,
      [
        {
          filename: zipName,
          path: zipPath,
        },
      ],
    );

    logger.info(`✅ Backup email sent successfully to slsuyel@gmail.com`);

    // 5. Cleanup local JSON
    fs.unlinkSync(jsonPath);

    // 6. ROTATION: Keep only last 3 backups
    const files = fs
      .readdirSync(backupPath)
      .filter((f) => f.endsWith('.zip'))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(backupPath, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 3) {
      files.slice(3).forEach((f) => {
        fs.unlinkSync(path.join(backupPath, f.name));
        logger.info(`🗑️ Old backup deleted: ${f.name}`);
      });
    }
  } catch (error: any) {
    logger.error(`❌ Backup failed: ${error.message}`);
  }
};
