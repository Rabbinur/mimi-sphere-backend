import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Product } from '../products/product.model';
import { OrderModel as Order } from '../orders/order.model';
import { IPosOrderPayload, IPosProductItem } from './pos.interface';
import { PosCustomer, calculateMembership } from './posCustomer.model';
import { MembershipSettings } from './membershipSettings.model';
import { PosExpense } from './posExpense.model';
import { PosStockAdjustment } from './posStockAdjustment.model';
import { posCalculationService } from './posCalculation.service';
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
    const orderProducts = payload.items.map((it) => ({
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      title: it.product_name,
      thumbnail: it.image || null,
      price: it.price,
      quantity: it.quantity,
      total_price: it.total || it.price * it.quantity,
    }));

    // Create Order in DB
    const order = await Order.create({
      order_id: orderNumber,
      order_type: 'POS',
      customer_name: payload.customer_name || 'Walk-in Customer',
      phone: payload.customer_phone || '01700000000',
      email: payload.customer_email || 'walkin@store.local',
      district: 'Dhaka',
      upazila: 'In-Store POS',
      village_or_area: 'Store Counter',
      delivery_zone: 'inside_dhaka',
      products: orderProducts,
      total_price: payload.total,
      discount_amount: payload.discount || 0,
      coupon: payload.coupon_code || undefined,
      order_status: 'delivered', // In-store POS sale is delivered directly
      payment_status: 'paid',
      payment_method: payload.payment_method || 'POS_CASH',
      delivery_charge: 0,
      notes: payload.note || 'In-Store POS Counter Purchase',
    });

    // Update or create PosCustomer record for offline customer
    const cleanPhone = payload.customer_phone ? payload.customer_phone.trim().replace(/[\s-]/g, '') : '';
    let customerTier = payload.membership_tier || 'Regular';

    if (cleanPhone && cleanPhone.length >= 10 && cleanPhone !== '01700000000') {
      const orderTotal = Number(payload.total) || 0;
      let customer = await PosCustomer.findOne({ phone: cleanPhone });

      if (customer) {
        customer.total_spent = (customer.total_spent || 0) + orderTotal;
        customer.total_orders = (customer.total_orders || 0) + 1;
        if (payload.customer_name && payload.customer_name !== 'Walk-in Customer') {
          customer.name = payload.customer_name;
        }
        if (payload.customer_email) {
          customer.email = payload.customer_email;
        }
        const { tier, discountPercent } = calculateMembership(customer.total_spent);
        customer.membership_tier = tier;
        customer.discount_percent = discountPercent;
        customer.last_purchase_at = new Date();
        await customer.save();
        customerTier = customer.membership_tier;
      } else {
        const { tier, discountPercent } = calculateMembership(orderTotal);
        customer = await PosCustomer.create({
          name: payload.customer_name || 'Walk-in Customer',
          phone: cleanPhone,
          email: payload.customer_email,
          total_spent: orderTotal,
          total_orders: 1,
          membership_tier: tier,
          discount_percent: discountPercent,
          last_purchase_at: new Date(),
        });
        customerTier = customer.membership_tier;
      }
    }

    // Generate QR Code for thermal receipt
    let thermalQrCode = '';
    try {
      thermalQrCode = await QRCode.toDataURL('https://www.mimisphere.com', {
        margin: 1,
        width: 140,
      });
    } catch (err) {
      // Fallback
    }

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
      membership_tier: customerTier,
      items: payload.items,
      subtotal: payload.subtotal,
      discount: payload.discount || 0,
      tax: payload.tax || 0,
      total: payload.total,
      payment_method: payload.payment_method,
      tendered_amount: payload.tendered_amount || payload.total,
      change_amount: payload.change_amount || 0,
      qr_code: thermalQrCode,
    };

    return receiptData;
  }

  // 4. Customer Lookup by Phone for POS Membership
  async lookupCustomer(phone: string) {
    const cleanPhone = phone ? phone.trim().replace(/[\s-]/g, '') : '';
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new ApiError(HttpStatusCode.BAD_REQUEST, 'A valid 11-digit phone number is required');
    }

    // 1. Search in PosCustomer
    let customer = await PosCustomer.findOne({ phone: cleanPhone });

    // 2. If not found in PosCustomer, check if customer made past orders in OrderModel
    if (!customer) {
      const pastOrders = await Order.find({ phone: cleanPhone, payment_status: 'paid' }).lean();
      if (pastOrders.length > 0) {
        const pastSpent = pastOrders.reduce((sum, o: any) => sum + (o.total_price || 0), 0);
        const latestOrder = pastOrders[pastOrders.length - 1];
        const { tier, discountPercent } = calculateMembership(pastSpent);

        customer = await PosCustomer.create({
          phone: cleanPhone,
          name: latestOrder?.customer_name || 'Walk-in Customer',
          email: latestOrder?.email,
          total_spent: pastSpent,
          total_orders: pastOrders.length,
          membership_tier: tier,
          discount_percent: discountPercent,
          last_purchase_at: latestOrder.createdAt,
        });
      }
    }

    if (customer) {
      // Re-calculate tier in case spent exceeded threshold
      const { tier, discountPercent } = calculateMembership(customer.total_spent);
      if (customer.membership_tier !== tier || customer.discount_percent !== discountPercent) {
        customer.membership_tier = tier;
        customer.discount_percent = discountPercent;
        await customer.save();
      }
      return customer;
    }

    // Customer not found in DB
    return null;
  }

  // 4. Daily Shift Sales Summary (Pure POS Counter - 100% Isolated)
  async getPosShiftSummary(date?: string) {
    return posCalculationService.calculatePosShiftSummary(date);
  }

  // 4b. Dedicated Today's Profit Analytics (Storewide / POS / Online)
  async getTodayProfit(query?: { channel?: string; date?: string }) {
    return posCalculationService.calculateTodayProfit(query);
  }

  // 5. Get Latest / Last POS Order Receipt (100% Database Driven)
  async getLastReceipt() {
    let order = await Order.findOne({ order_type: 'POS' })
      .sort({ createdAt: -1 })
      .lean();

    if (!order) {
      order = await Order.findOne({})
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!order) {
      return null;
    }

    let thermalQrCode = '';
    try {
      thermalQrCode = await QRCode.toDataURL('https://www.mimisphere.com', {
        margin: 1,
        width: 140,
      });
    } catch (err) {}

    const receiptNumber = order.order_id || String(order._id).slice(-6).toUpperCase();
    const orderNumber = order.order_id || String(order._id).slice(-8).toUpperCase();

    // Fetch membership tier if available for this customer
    let membershipTier = 'Regular';
    let discountPercent = 0;
    if (order.phone) {
      const posCustomer = await PosCustomer.findOne({ phone: order.phone }).lean();
      if (posCustomer) {
        membershipTier = posCustomer.membership_tier || 'Regular';
        discountPercent = posCustomer.discount_percent || 0;
      }
    }

    const discount = Number(order.discount_amount || 0);
    const total = Number(order.total_price || 0);
    const subtotal = total + discount;

    const receiptData = {
      receipt_number: receiptNumber,
      order_number: orderNumber,
      order_id: String(order._id),
      created_at: new Date(order.createdAt || Date.now()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      customer_name: order.customer_name || 'Walk-in Customer',
      customer_phone: order.phone || '',
      customer_email: order.email || '',
      membership_tier: membershipTier,
      discount_percent: discountPercent,
      subtotal,
      discount,
      tax: 0,
      total,
      payment_method: order.payment_method || 'POS_CASH',
      tendered_amount: total,
      change_amount: 0,
      qr_code: thermalQrCode,
      items: ((order.products || (order as any).items || []) as any[]).map((it) => {
        let combinationLabel = it.variant_combination || it.combination_label || '';
        if (!combinationLabel && it.selected_variant_values) {
          if (it.selected_variant_values instanceof Map) {
            combinationLabel = Array.from(it.selected_variant_values.values()).join(' / ');
          } else if (typeof it.selected_variant_values === 'object') {
            combinationLabel = Object.values(it.selected_variant_values).join(' / ');
          }
        }
        return {
          product_id: it.product_id,
          variant_id: it.variant_id || undefined,
          product_name: it.title || it.product_name || '',
          quantity: it.quantity || 1,
          price: it.price || 0,
          total: it.total_price || it.total || (it.price || 0) * (it.quantity || 1),
          combination_label: combinationLabel,
        };
      }),
    };

    return receiptData;
  }

  // ── Membership Settings ──────────────────────────────────────────
  async getMembershipSettings() {
    let settings = await MembershipSettings.findOne().lean();
    if (!settings) {
      // Return defaults without saving
      return {
        silver_threshold: 1000,
        silver_discount: 5,
        gold_threshold: 3500,
        gold_discount: 7,
      };
    }
    return settings;
  }

  async updateMembershipSettings(data: {
    silver_threshold: number;
    silver_discount: number;
    gold_threshold: number;
    gold_discount: number;
  }) {
    const settings = await MembershipSettings.findOneAndUpdate(
      {},
      { $set: data },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    // Re-calculate all existing customers with new thresholds
    const allCustomers = await PosCustomer.find({}).lean();
    const bulkOps = allCustomers.map((c) => {
      let tier: 'Regular' | 'Silver' | 'Gold' = 'Regular';
      let discount = 0;
      if (c.total_spent >= data.gold_threshold) {
        tier = 'Gold'; discount = data.gold_discount;
      } else if (c.total_spent >= data.silver_threshold) {
        tier = 'Silver'; discount = data.silver_discount;
      }
      return {
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { membership_tier: tier, discount_percent: discount } },
        },
      };
    });
    if (bulkOps.length > 0) await PosCustomer.bulkWrite(bulkOps);

    return settings;
  }

  // ── Members List ──────────────────────────────────────────────────
  async getMembersList(query: {
    search?: string;
    tier?: string;
    page?: number;
    per_page?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.per_page) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.tier && query.tier !== 'All') filter.membership_tier = query.tier;
    if (query.search) {
      const re = new RegExp(query.search, 'i');
      filter.$or = [{ name: re }, { phone: re }];
    }

    const [customers, total] = await Promise.all([
      PosCustomer.find(filter)
        .sort({ total_spent: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PosCustomer.countDocuments(filter),
    ]);

    return { customers, total, page, per_page: limit, total_pages: Math.ceil(total / limit) };
  }

  // ── Customer Purchase History ─────────────────────────────────────
  async getCustomerHistory(phone: string) {
    const customer = await PosCustomer.findOne({ phone }).lean();
    if (!customer) throw new ApiError(HttpStatusCode.NOT_FOUND, 'Customer not found');

    const orders = await Order.find({
      $or: [{ phone }, { customer_phone: phone } as any],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return { customer, orders };
  }

  // ── 7. Get POS Orders List (Matching Image 2 Tabs: Onhold, Unpaid, Paid) ──
  async getPosOrdersList(query: {
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.per_page) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { order_type: 'POS' };

    if (query.status && query.status !== 'all') {
      if (query.status === 'paid') {
        filter.payment_status = 'paid';
      } else if (query.status === 'unpaid') {
        filter.payment_status = { $in: ['pending', 'failed'] };
      } else if (query.status === 'onhold') {
        filter.order_status = { $in: ['pending', 'processing'] };
      }
    }

    if (query.search) {
      const searchRe = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { order_id: searchRe },
        { customer_name: searchRe },
        { phone: searchRe },
        { 'products.title': searchRe },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select('order_id customer_name phone email total_price discount_amount payment_status payment_method order_status notes products createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const formattedOrders = orders.map((o: any) => ({
      _id: o._id,
      order_id: o.order_id,
      cashier: 'admin',
      customer: o.customer_name || 'Walk-in Customer',
      customer_phone: o.phone || '',
      customer_email: o.email || '',
      total: Number(o.total_price || 0),
      discount: Number(o.discount_amount || 0),
      payment_status: o.payment_status || 'paid',
      payment_method: o.payment_method || 'POS_CASH',
      order_status: o.order_status || 'delivered',
      date: new Date(o.createdAt || Date.now()).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      note: o.notes || '',
      items_count: (o.products || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
      products: (o.products || []).map((it: any) => ({
        product_id: it.product_id,
        variant_id: it.variant_id,
        title: it.title,
        price: it.price,
        quantity: it.quantity,
        total_price: it.total_price || (it.price * it.quantity),
      })),
    }));

    return {
      orders: formattedOrders,
      total,
      page,
      per_page: limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  // ── 8. Get Recent POS Transactions (Matching Image 3 Tabs: Purchase, Payment, Return) ──
  async getPosTransactions(query: {
    type?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.per_page) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { order_type: 'POS' };

    if (query.type && query.type !== 'all') {
      if (query.type === 'purchase' || query.type === 'payment') {
        filter.payment_status = 'paid';
      } else if (query.type === 'return') {
        filter.order_status = { $in: ['returned', 'refunded'] };
      }
    }

    if (query.search) {
      const searchRe = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { order_id: searchRe },
        { customer_name: searchRe },
        { phone: searchRe },
        { payment_method: searchRe },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select('order_id customer_name phone total_price payment_method payment_status order_status createdAt products')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const transactions = orders.map((o: any) => ({
      _id: o._id,
      customer_name: o.customer_name || 'Walk-in Customer',
      customer_phone: o.phone || '',
      reference: o.order_id,
      date: new Date(o.createdAt || Date.now()).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: new Date(o.createdAt || Date.now()).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      amount: Number(o.total_price || 0),
      payment_method: o.payment_method || 'POS_CASH',
      payment_status: o.payment_status || 'paid',
      order_status: o.order_status || 'delivered',
      items_count: (o.products || []).reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
      products: o.products || [],
    }));

    return {
      transactions,
      total,
      page,
      per_page: limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }

  async updatePosTransaction(id: string, payload: {
    customer_name?: string;
    customer_phone?: string;
    payment_method?: string;
    payment_status?: string;
    order_status?: string;
  }) {
    const updateData: any = {};
    if (payload.customer_name !== undefined) updateData.customer_name = payload.customer_name;
    if (payload.customer_phone !== undefined) updateData.phone = payload.customer_phone;
    if (payload.payment_method !== undefined) updateData.payment_method = payload.payment_method;
    if (payload.payment_status !== undefined) updateData.payment_status = payload.payment_status;
    if (payload.order_status !== undefined) updateData.order_status = payload.order_status;

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updatedOrder) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'Transaction not found');
    }
    return updatedOrder;
  }

  // ── 9. POS Expenses Management ──
  async createPosExpense(payload: {
    title: string;
    amount: number;
    category?: string;
    notes?: string;
    date?: string;
    created_by?: string;
  }) {
    if (!payload.title || !payload.amount) {
      throw new ApiError(HttpStatusCode.BAD_REQUEST, 'Title and amount are required');
    }
    const expense = await PosExpense.create({
      title: payload.title.trim(),
      amount: Number(payload.amount),
      category: payload.category || 'General',
      notes: payload.notes || '',
      date: payload.date ? new Date(payload.date) : new Date(),
      created_by: payload.created_by || 'Admin',
    });
    return expense;
  }

  async getPosExpenses(query?: { date?: string }) {
    const filter: any = {};
    if (query?.date) {
      const start = new Date(`${query.date}T00:00:00.000+06:00`);
      const end = new Date(`${query.date}T23:59:59.999+06:00`);
      filter.date = { $gte: start, $lte: end };
    }
    return PosExpense.find(filter).sort({ createdAt: -1 }).lean();
  }

  async deletePosExpense(id: string) {
    const deleted = await PosExpense.findByIdAndDelete(id).lean();
    if (!deleted) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'Expense not found');
    }
    return deleted;
  }

  // 12. Batch Sync Offline Orders
  async syncOfflineOrders(payload: { orders: any[] }) {
    const orders = payload?.orders || [];
    if (!Array.isArray(orders) || orders.length === 0) {
      return { synced_count: 0, orders: [] };
    }

    const results = [];
    for (const rawOrder of orders) {
      try {
        const offlineId = rawOrder.offline_id || rawOrder.receipt_number || '';
        
        // Idempotency check: avoid double-saving if already synced
        if (offlineId) {
          const existing = await Order.findOne({
            $or: [
              { order_id: offlineId },
              { notes: { $regex: offlineId, $options: 'i' } },
            ],
          }).lean();

          if (existing) {
            results.push({
              offline_id: offlineId,
              order_id: existing.order_id,
              status: 'already_synced',
            });
            continue;
          }
        }

        // Process order creation & stock deduction
        const enrichedPayload: IPosOrderPayload = {
          items: rawOrder.items || [],
          subtotal: Number(rawOrder.subtotal || rawOrder.total || 0),
          discount: Number(rawOrder.discount || 0),
          total: Number(rawOrder.total || 0),
          payment_method: rawOrder.payment_method || 'POS_CASH',
          tendered_amount: Number(rawOrder.tendered_amount || rawOrder.total || 0),
          change_amount: Number(rawOrder.change_amount || 0),
          customer_name: rawOrder.customer_name || 'Walk-in Customer',
          customer_phone: rawOrder.customer_phone || '',
          customer_email: rawOrder.customer_email || '',
          membership_tier: rawOrder.membership_tier,
          note: `[Offline Sync: ${offlineId}] ${rawOrder.note || 'Offline POS Sale'}`,
        };

        const createdReceipt = await this.createPosOrder(enrichedPayload);
        results.push({
          offline_id: offlineId,
          order_id: createdReceipt.order_id,
          receipt_number: createdReceipt.receipt_number,
          status: 'success',
        });
      } catch (err: any) {
        results.push({
          offline_id: rawOrder.offline_id || 'unknown',
          status: 'error',
          message: err?.message || 'Failed to sync offline order',
        });
      }
    }

    return {
      synced_count: results.filter((r) => r.status === 'success').length,
      orders: results,
    };
  }

  // 13. Batch Sync Offline Expenses
  async syncOfflineExpenses(payload: { expenses: any[] }) {
    const expenses = payload?.expenses || [];
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return { synced_count: 0, expenses: [] };
    }

    const results = [];
    for (const rawExp of expenses) {
      try {
        const offlineId = rawExp.offline_id || '';
        if (offlineId) {
          const existing = await PosExpense.findOne({
            notes: { $regex: offlineId, $options: 'i' },
          }).lean();
          if (existing) {
            results.push({ offline_id: offlineId, status: 'already_synced' });
            continue;
          }
        }

        const exp = await PosExpense.create({
          title: (rawExp.title || 'General Expense').trim(),
          amount: Number(rawExp.amount || 0),
          category: rawExp.category || 'General',
          notes: `[Offline: ${offlineId}] ${rawExp.notes || ''}`.trim(),
          date: rawExp.date ? new Date(rawExp.date) : new Date(),
          created_by: rawExp.created_by || 'Admin (Offline Sync)',
        });

        results.push({
          offline_id: offlineId,
          expense_id: exp._id,
          status: 'success',
        });
      } catch (err: any) {
        results.push({
          offline_id: rawExp.offline_id || 'unknown',
          status: 'error',
          message: err?.message || 'Failed to sync expense',
        });
      }
    }

    return {
      synced_count: results.filter((r) => r.status === 'success').length,
      expenses: results,
    };
  }
}


export const posService = new PosService();
