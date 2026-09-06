import mongoose from 'mongoose';
import { Product } from '../products/product.model';
import { OrderModel as Order } from '../orders/order.model';
import { IPosOrderPayload, IPosProductItem } from './pos.interface';
import ApiError from '../../middlewares/error';
import { HttpStatusCode } from '../../../lib/httpStatus';

class PosService {
  // 1. Get products for POS touch grid
  async getPosProducts(query: {
    search?: string;
    category_id?: string;
    page?: number;
    per_page?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.per_page) || 24;
    const skip = (page - 1) * limit;

    const filter: any = { product_status: 'active' };

    if (query.category_id) {
      filter.product_categories = new mongoose.Types.ObjectId(query.category_id);
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { product_title: searchRegex },
        { sku: searchRegex },
        { 'product_variants.variant_option_values': searchRegex },
      ];
    }

    const [rawProducts, total] = await Promise.all([
      Product.find(filter)
        .populate('product_categories', 'name _id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const formattedProducts: IPosProductItem[] = rawProducts.map((p: any) => {
      const hasVariants = Boolean(p.product_variants && p.product_variants.length > 0);

      const variants = hasVariants
        ? p.product_variants.map((v: any, index: number) => {
            const labels = v.variant_option_values
              ? Object.entries(v.variant_option_values)
                  .map(([k, val]) => `${val}`)
                  .join(' / ')
              : `Variant ${index + 1}`;

            return {
              variant_id: v._id ? String(v._id) : `${p._id}_var_${index}`,
              combination_label: labels,
              sku: v.sku || p.sku,
              barcode: v.barcode || v.sku || `BAR-${p._id}-${index}`,
              price: v.variant_price || p.product_price,
              cost_price: v.cost_price || p.cost_price || 0,
              stock_quantity: v.variant_quantity ?? 0,
              image: v.image || p.thumbnail,
            };
          })
        : undefined;

      return {
        product_id: String(p._id),
        product_name: p.product_title,
        sku: p.sku || '',
        barcode: p.barcode || p.sku || `BAR-${p._id}`,
        price: p.product_price,
        cost_price: p.cost_price || 0,
        stock_quantity: p.quantity ?? 0,
        image: p.thumbnail || (p.product_images && p.product_images[0]) || '',
        category_id: p.product_categories?.[0]?._id ? String(p.product_categories[0]._id) : undefined,
        has_variants: hasVariants,
        variants_count: variants ? variants.length : 0,
        variants,
      };
    });

    return {
      data: formattedProducts,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        last_page: Math.ceil(total / limit) || 1,
      },
    };
  }

  // 2. Barcode & SKU lookup for scanner
  async scanBarcode(barcode: string) {
    if (!barcode) {
      throw new ApiError(HttpStatusCode.BAD_REQUEST, 'Barcode is required');
    }

    const cleanCode = barcode.trim();
    const regex = new RegExp(`^${cleanCode}$`, 'i');

    // Find product matching root sku or nested variants
    const product: any = await Product.findOne({
      $or: [
        { sku: regex },
        { barcode: regex },
        { 'product_variants.sku': regex },
        { 'product_variants.barcode': regex },
        { _id: mongoose.isValidObjectId(cleanCode) ? cleanCode : undefined },
      ].filter(Boolean),
    }).lean();

    if (!product) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, `Product not found for barcode: ${cleanCode}`);
    }

    // Check if matched a specific variant
    if (product.product_variants && product.product_variants.length > 0) {
      const matchedVariantIndex = product.product_variants.findIndex((v: any) => {
        return (
          (v.sku && v.sku.toLowerCase() === cleanCode.toLowerCase()) ||
          (v.barcode && v.barcode.toLowerCase() === cleanCode.toLowerCase()) ||
          (v._id && String(v._id) === cleanCode)
        );
      });

      if (matchedVariantIndex !== -1) {
        const v = product.product_variants[matchedVariantIndex];
        const labels = v.variant_option_values
          ? Object.entries(v.variant_option_values)
              .map(([k, val]) => `${val}`)
              .join(' / ')
          : `Variant ${matchedVariantIndex + 1}`;

        return {
          product_id: String(product._id),
          variant_id: String(v._id || `${product._id}_var_${matchedVariantIndex}`),
          product_name: product.product_title,
          combination_label: labels,
          sku: v.sku || product.sku,
          barcode: v.barcode || v.sku || cleanCode,
          price: v.variant_price || product.product_price,
          cost_price: v.cost_price || product.cost_price || 0,
          stock_quantity: v.variant_quantity ?? 0,
          image: v.image || product.thumbnail,
          has_variants: true,
        };
      }
    }

    return {
      product_id: String(product._id),
      product_name: product.product_title,
      sku: product.sku || '',
      barcode: product.barcode || product.sku || cleanCode,
      price: product.product_price,
      cost_price: product.cost_price || 0,
      stock_quantity: product.quantity ?? 0,
      image: product.thumbnail || (product.product_images && product.product_images[0]) || '',
      has_variants: Boolean(product.product_variants && product.product_variants.length > 0),
    };
  }

  // 3. Create POS In-Store Order
  async createPosOrder(payload: IPosOrderPayload) {
    if (!payload.items || payload.items.length === 0) {
      throw new ApiError(HttpStatusCode.BAD_REQUEST, 'Cart cannot be empty');
    }

    const receiptNumber = `POS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const orderNumber = `ORD-POS-${Date.now()}`;

    // Deduct stock for each cart item
    for (const item of payload.items) {
      if (item.variant_id && item.variant_id !== item.product_id) {
        // Deduct variant stock
        await Product.updateOne(
          {
            _id: item.product_id,
            'product_variants._id': item.variant_id,
          },
          {
            $inc: {
              'product_variants.$.variant_quantity': -Number(item.quantity),
              quantity: -Number(item.quantity),
              total_sale: Number(item.quantity),
            },
          }
        );
      } else {
        // Deduct product main stock
        await Product.updateOne(
          { _id: item.product_id },
          {
            $inc: {
              quantity: -Number(item.quantity),
              total_sale: Number(item.quantity),
            },
          }
        );
      }
    }

    // Format products for standard Order model
    const orderItems = payload.items.map((it) => ({
      product_id: it.product_id,
      quantity: it.quantity,
      price: it.price,
      name: it.product_name,
      image: it.image || '',
      variant: it.combination_label || '',
      sku: it.sku || '',
    }));

    // Create Order in DB
    const order = await Order.create({
      order_id: orderNumber,
      receipt_number: receiptNumber,
      order_type: 'POS',
      customer_name: payload.customer_name || 'Walk-in Customer',
      customer_phone: payload.customer_phone || 'N/A',
      customer_email: payload.customer_email || 'walkin@store.local',
      items: orderItems,
      total_price: payload.total,
      subtotal: payload.subtotal,
      discount: payload.discount || 0,
      coupon_code: payload.coupon_code || '',
      tax: payload.tax || 0,
      status: 'Delivered', // In-store POS sale is delivered on counter
      payment_status: 'Paid',
      payment_method: payload.payment_method || 'cash',
      delivery_charge: 0,
      shipping_address: {
        address: 'In-Store Counter Purchase',
        city: 'Dhaka',
      },
    });

    const receiptData = {
      receipt_number: receiptNumber,
      order_number: orderNumber,
      order_id: String(order._id),
      created_at: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      customer_name: payload.customer_name || 'Walk-in Customer',
      customer_phone: payload.customer_phone || '',
      customer_email: payload.customer_email || '',
      items: payload.items,
      subtotal: payload.subtotal,
      discount: payload.discount || 0,
      tax: payload.tax || 0,
      total: payload.total,
      payment_method: payload.payment_method,
      tendered_amount: payload.tendered_amount || payload.total,
      change_amount: payload.change_amount || 0,
    };

    return receiptData;
  }

  // 4. Daily Shift Sales Summary
  async getPosShiftSummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      order_type: 'POS',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let digitalSales = 0;
    let totalDiscount = 0;
    let totalItemsSold = 0;

    orders.forEach((o: any) => {
      totalSales += o.total_price || 0;
      totalDiscount += o.discount || 0;

      if (o.payment_method === 'cash') {
        cashSales += o.total_price || 0;
      } else if (o.payment_method === 'card') {
        cardSales += o.total_price || 0;
      } else {
        digitalSales += o.total_price || 0;
      }

      if (Array.isArray(o.items)) {
        o.items.forEach((it: any) => {
          totalItemsSold += it.quantity || 1;
        });
      }
    });

    return {
      date: new Date().toISOString().split('T')[0],
      total_orders: orders.length,
      total_sales: totalSales,
      cash_sales: cashSales,
      card_sales: cardSales,
      digital_sales: digitalSales,
      total_discount: totalDiscount,
      total_items_sold: totalItemsSold,
    };
  }
}

export const posService = new PosService();
