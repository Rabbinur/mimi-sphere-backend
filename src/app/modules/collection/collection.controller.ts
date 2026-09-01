import { Request, Response } from 'express';
import { collectionServices } from './collection.service';
import { CollectionModel } from './collection.model';
import { generateSlug } from '../../utils/generateSlug';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/errorHandler';

const createCollection = catchAsync(async (req: Request, res: Response) => {
  const collectionData = req.body;
  const slug = generateSlug(collectionData.name);
  collectionData.slug = slug;

  const exists = await CollectionModel.findOne({ name: collectionData.name });
  if (exists) {
    throw new AppError('Collection with this name already exists.', 400);
  }

  const newCollection = await collectionServices.createCollection(collectionData);

  res.status(201).json({
    statusCode: 201,
    success: true,
    message: 'Collection created successfully.',
    data: newCollection,
  });
});

const getAllCollections = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, searchTerm } = req.query;
  const result = await collectionServices.getAllCollections(
    page as string,
    limit as string,
    searchTerm as string,
  );
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Collections retrieved successfully',
    data: result,
  });
});

const getCollectionById = catchAsync(async (req: Request, res: Response) => {
  const collectionId: string = req.params.id;
  const collection = await collectionServices.getCollectionById(collectionId);

  if (!collection) {
    throw new AppError('Collection not found', 404);
  }

  res.status(200).json(collection);
});

const getCollectionBySlug = catchAsync(async (req: Request, res: Response) => {
  const slug: string = req.params.slug;
  const collection = await collectionServices.getCollectionBySlug(slug);

  if (!collection) {
    throw new AppError('Collection not found', 404);
  }

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Collection retrieved successfully.',
    data: collection,
  });
});

const updateCollection = catchAsync(async (req: Request, res: Response) => {
  const collectionId: string = req.params.id;
  const collectionData = req.body;

  if (collectionData.name) {
    collectionData.slug = generateSlug(collectionData.name);
  }

  const updatedCollection = await collectionServices.updateCollection(collectionId, collectionData);

  if (!updatedCollection) {
    throw new AppError('Collection not found.', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Collection updated successfully.',
    data: updatedCollection,
  });
});

const deleteCollection = catchAsync(async (req: Request, res: Response) => {
  const collectionId: string = req.params.id;
  const deletedCollection = await collectionServices.deleteCollection(collectionId);

  if (!deletedCollection) {
    throw new AppError('Collection not found', 404);
  }

  res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Collection deleted successfully',
    data: deletedCollection,
  });
});

export const collectionController = {
  createCollection,
  getAllCollections,
  getCollectionById,
  getCollectionBySlug,
  updateCollection,
  deleteCollection,
};
