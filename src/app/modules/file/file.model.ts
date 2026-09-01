import { Schema, model } from 'mongoose';
import { IFile } from './file.interface';

const FileSchema = new Schema<IFile>({
  url: { type: String, required: true },
  key: { type: String, required: true },
  size: { type: Number, required: true },
  mimetype: { type: String, required: true },
  title: { type: String, required: true },
}, {
  timestamps: true,
});

export const FileModel = model<IFile>('File', FileSchema);
