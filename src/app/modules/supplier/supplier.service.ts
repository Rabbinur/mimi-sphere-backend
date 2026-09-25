import { SupplierModel } from './supplier.model';
import { TSupplier } from './supplier.interface';

const createSupplier = async (payload: TSupplier) => {
    const result = await SupplierModel.create(payload);
    return result;
};

const getAllSuppliers = async (searchTerm: string = '') => {
    const query = searchTerm
        ? {
              $or: [
                  { name: { $regex: searchTerm, $options: 'i' } },
                  { phone: { $regex: searchTerm, $options: 'i' } }
              ]
          }
        : {};

    const result = await SupplierModel.find(query).sort({ createdAt: -1 });
    return result;
};

const getSupplierById = async (id: string) => {
    const result = await SupplierModel.findById(id);
    return result;
};

const updateSupplier = async (id: string, payload: Partial<TSupplier>) => {
    const result = await SupplierModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
};

const deleteSupplier = async (id: string) => {
    const result = await SupplierModel.findByIdAndDelete(id);
    return result;
};

const addPaymentHistory = async (id: string, payload: any) => {
    const supplier = await SupplierModel.findById(id);
    if (!supplier) throw new Error('Supplier not found');

    const paymentAmount = Number(payload.amount) || 0;
    
    // Add to payment history array
    supplier.paymentHistory.push(payload);
    
    // Update paid and due
    supplier.totalPaid += paymentAmount;
    supplier.totalDue = Math.max(0, supplier.totalPurchase - supplier.totalPaid);
    
    await supplier.save();
    return supplier;
};

export const supplierServices = {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    addPaymentHistory
};
