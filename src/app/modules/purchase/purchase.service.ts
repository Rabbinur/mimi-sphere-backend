import { PurchaseModel } from './purchase.model';
import { TPurchase } from './purchase.interface';
import { SupplierModel } from '../supplier/supplier.model';
import { Product } from '../products/product.model';
import mongoose from 'mongoose';

const createPurchase = async (payload: TPurchase) => {
    // We start a transaction if replica sets are enabled, but for standard local dev we'll do sequential updates.
    
    // 1. Create Purchase
    const newPurchase = await PurchaseModel.create(payload);

    // 2. Update Supplier Data
    const supplier = await SupplierModel.findById(payload.supplierId);
    if (supplier) {
        supplier.totalPurchase += payload.grandTotal;
        supplier.totalPaid += payload.paidAmount;
        supplier.totalDue += payload.dueAmount;
        await supplier.save();
    }

    // 3. Update Inventory (Products) if status is Received
    if (payload.status === 'Received') {
        for (const item of payload.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { quantity: item.quantity } },
                { new: true }
            );
            
            // If they are using specific variants, we could update the variant quantity too, but typically total quantity is enough for basic sync.
        }
    }

    return newPurchase;
};

const getAllPurchases = async (searchTerm: string = '') => {
    const query = searchTerm
        ? {
              $or: [
                  { reference: { $regex: searchTerm, $options: 'i' } }
              ]
          }
        : {};

    const result = await PurchaseModel.find(query)
        .populate('supplierId', 'name contactPerson phone')
        .populate('items.productId', 'product_title product_images product_price')
        .sort({ createdAt: -1 });
    return result;
};

const getPurchaseById = async (id: string) => {
    const result = await PurchaseModel.findById(id)
        .populate('supplierId')
        .populate('items.productId');
    return result;
};

const updatePurchase = async (id: string, payload: Partial<TPurchase>) => {
    const oldPurchase = await PurchaseModel.findById(id);
    if (!oldPurchase) throw new Error('Purchase not found');

    const result = await PurchaseModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });

    // If status changed from Pending/Ordered to Received, we need to add to inventory
    if (oldPurchase.status !== 'Received' && payload.status === 'Received' && result) {
        for (const item of result.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { quantity: item.quantity } },
                { new: true }
            );
        }
    }

    return result;
};

const deletePurchase = async (id: string) => {
    // In a real accounting system, deleting a purchase should reverse supplier balances and inventory.
    // For simplicity, we just delete the record here.
    const result = await PurchaseModel.findByIdAndDelete(id);
    return result;
};

export const purchaseServices = {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
};
