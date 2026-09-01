import { Types } from 'mongoose';
import { FileModel } from './file.model';
import { IFile } from './file.interface';
import { paginate } from '../../utils/pagination';

const createFile = async (fileData: IFile): Promise<IFile> => {
  const newFile = new FileModel(fileData);
  return await newFile.save();
};

const getAllFiles = async (search?: string, page = 1, limit = 10) => {
  const searchQuery = search
    ? { title: { $regex: search, $options: 'i' } }
    : {};

  return paginate(FileModel, searchQuery, page, limit);
};



const getFileById = async (id: string): Promise<IFile | null> => {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid file ID');
  const file = await FileModel.findById(id);
  if (!file) throw new Error('File not found');
  return file;
};

const updateFile = async (id: string, updateData: Partial<IFile>): Promise<IFile | null> => {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid file ID');
  const updatedFile = await FileModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!updatedFile) throw new Error('File not found');
  return updatedFile;
};

const deleteFile = async (id: string): Promise<IFile | null> => {
  if (!Types.ObjectId.isValid(id)) throw new Error('Invalid file ID');
  const deletedFile = await FileModel.findByIdAndDelete(id);
  if (!deletedFile) throw new Error('File not found');
  return deletedFile;
};

// services/fileServices.ts
const deleteFiles = async (ids: string[]): Promise<IFile[]> => {
  const validIds = ids.filter(id => Types.ObjectId.isValid(id));

  if (validIds.length === 0) throw new Error('No valid file IDs provided');

  const deletedFiles = await FileModel.find({ _id: { $in: validIds } });

  if (deletedFiles.length === 0) throw new Error('No matching files found');

  await FileModel.deleteMany({ _id: { $in: validIds } });

  return deletedFiles;
};



export const fileServices = {
  createFile,
  getAllFiles,
  getFileById,
  updateFile,
  deleteFile,
  deleteFiles
};
