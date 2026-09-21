import mongoose from 'mongoose';
import { OrderModel as Order } from '../orders/order.model';
import { Product } from '../products/product.model';
import { CategoryModel } from '../category/category.model';
import { BrandModel } from '../brand/brand.model';
import { PosExpense } from '../pos/posExpense.model';
import { posCalculationService } from '../pos/posCalculation.service';
import { IFinancialStatement, IReportQuery } from './reports.interface';

class ReportsService {
  /**
   * Helper to parse date range in Bangladesh Standard Time (UTC+6)
   */
  private parseBstDateRange(startDateStr?: string, endDateStr?: string) {
    let start: Date;
    let end: Date;

    const bstOffset = 6 * 60 * 60 * 1000;
    const now = new Date();
    const bstNow = new Date(now.getTime() + bstOffset);
    const todayStr = bstNow.toISOString().split('T')[0];

    const validStart = startDateStr && /^\d{4}-\d{2}-\d{2}$/.test(startDateStr.trim())
      ? startDateStr.trim()
      : todayStr;
    const validEnd = endDateStr && /^\d{4}-\d{2}-\d{2}$/.test(endDateStr.trim())
      ? endDateStr.trim()
      : validStart;

    start = new Date(`${validStart}T00:00:00.000+06:00`);
    end = new Date(`${validEnd}T23:59:59.999+06:00`);

    return {
      start,
      end,
      formattedStart: validStart,
      formattedEnd: validEnd,
    };
  }

  /**
   * Comprehensive Financial Profit & Loss Statement and Analytics
   */
  async getProfitLossReport(query: IReportQuery): Promise<IFinancialStatement> {
    const { start, end, formattedStart, formattedEnd } = this.parseBstDateRange(
      query.startDate,
      query.endDate
    );
    const channel = (query.channel || 'all').toLowerCase();

    // 1. Build Base Order Query Filter
    const orderFilter: any = {
      createdAt: { $gte: start, $lte: end },
    };

    if (channel === 'pos') {
      orderFilter.order_type = 'POS';
    } else if (channel === 'online') {
      orderFilter.order_type = 'ONLINE';
    }

    // 2. Fetch Orders, Returns, Expenses in Parallel
    const [orders, returnOrders, expenses, closingStock] = await Promise.all([
      Order.find(orderFilter).lean(),
      Order.find({
        ...orderFilter,
        $or: [{ order_status: 'returned' }, { payment_status: 'refunded' }],
      }).lean(),
      PosExpense.find({
        date: { $gte: start, $lte: end },
      }).lean(),
      posCalculationService.calculateClosingStock(),
    ]);

    // 3. Collect Unique Product IDs for Accurate Cost Calculation
    const productIds = new Set<string>();
    orders.forEach((o: any) => {
      const items = o.products || o.items || [];
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          if (it.product_id && mongoose.isValidObjectId(it.product_id)) {
            productIds.add(String(it.product_id));
          }
        });
      }
    });

    const productsDb = productIds.size > 0
      ? await Product.find(
          { _id: { $in: Array.from(productIds) } },
          { cost_price: 1, product_price: 1, product_variants: 1, product_title: 1, thumbnail: 1 }
        ).lean()
      : [];

    const costMap = new Map<string, { cost: number; title: string; thumb: string }>();
    productsDb.forEach((p: any) => {
      const baseCost = Number(p.cost_price || 0);
      costMap.set(String(p._id), {
        cost: baseCost,
        title: p.product_title || 'Product',
        thumb: p.thumbnail || '',
      });
      if (Array.isArray(p.product_variants)) {
        p.product_variants.forEach((v: any) => {
          if (v._id) {
            costMap.set(String(v._id), {
              cost: Number(v.cost_price ?? p.cost_price ?? 0),
              title: `${p.product_title}`,
              thumb: v.image || p.thumbnail || '',
            });
          }
        });
      }
    });

    // 4. Calculate Financial Metrics & Top Products
    let totalSales = 0;
    let totalCogs = 0;
    let totalDiscount = 0;
    let totalItemsSold = 0;
    let posOrdersCount = 0;
    let posRevenue = 0;
    let onlineOrdersCount = 0;
    let onlineRevenue = 0;

    const paymentMap = new Map<string, { total: number; count: number }>();
    const timelineMap = new Map<string, { sales: number; cogs: number; expenses: number; profit: number; orders: number }>();
    const topProductsMap = new Map<string, { title: string; thumb: string; qty: number; revenue: number; cost: number }>();

    orders.forEach((o: any) => {
      const orderTotal = Number(o.total_price || 0);
      totalSales += orderTotal;
      totalDiscount += Number(o.discount_amount || o.discount || 0);

      const isPos = o.order_type === 'POS';
      if (isPos) {
        posOrdersCount++;
        posRevenue += orderTotal;
      } else {
        onlineOrdersCount++;
        onlineRevenue += orderTotal;
      }

      // Payment Method grouping
      const rawPm = String(o.payment_method || (isPos ? 'CASH' : 'COD')).toUpperCase();
      let normPm = 'CASH';
      if (rawPm.includes('CARD')) normPm = 'CARD';
      else if (rawPm.includes('BKASH') || rawPm.includes('MFS') || rawPm.includes('NAGAD')) normPm = 'BKASH / MFS';
      else if (rawPm.includes('ONLINE') || rawPm.includes('EKPAY')) normPm = 'ONLINE GATEWAY';
      else if (rawPm.includes('COD')) normPm = 'CASH ON DELIVERY';
      else if (rawPm.includes('DEPOSIT')) normPm = 'DEPOSIT PAYMENT';

      const currentPm = paymentMap.get(normPm) || { total: 0, count: 0 };
      currentPm.total += orderTotal;
      currentPm.count += 1;
      paymentMap.set(normPm, currentPm);

      // Timeline Date Key in BST (UTC + 6 hours)
      const orderDate = new Date(new Date(o.createdAt).getTime() + 6 * 3600 * 1000);
      const dateKey = orderDate.toISOString().split('T')[0];
      const currentDay = timelineMap.get(dateKey) || { sales: 0, cogs: 0, expenses: 0, profit: 0, orders: 0 };
      currentDay.sales += orderTotal;
      currentDay.orders += 1;

      // Item & COGS processing
      const items = o.products || o.items || [];
      let orderCogs = 0;
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const qty = Number(it.quantity || 1);
          totalItemsSold += qty;
          const matched =
            (it.variant_id && costMap.get(String(it.variant_id))) ||
            costMap.get(String(it.product_id));

          const unitCost = matched && matched.cost > 0 ? matched.cost : Number(it.price || 0) * 0.7;
          const itemCogs = unitCost * qty;
          const itemRevenue = Number(it.total_price || it.total || it.price * qty || 0);

          orderCogs += itemCogs;
          totalCogs += itemCogs;

          // Track Top Selling Product
          const pKey = String(it.product_id || it.title);
          const pStat = topProductsMap.get(pKey) || {
            title: it.title || matched?.title || 'Unknown Product',
            thumb: it.thumbnail || matched?.thumb || '',
            qty: 0,
            revenue: 0,
            cost: 0,
          };
          pStat.qty += qty;
          pStat.revenue += itemRevenue;
          pStat.cost += itemCogs;
          topProductsMap.set(pKey, pStat);
        });
      }

      currentDay.cogs += orderCogs;
      timelineMap.set(dateKey, currentDay);
    });

    // Process Expenses by Category & distribute into timeline
    let totalExpense = 0;
    const expenseCategoryMap = new Map<string, number>();

    expenses.forEach((exp: any) => {
      const amt = Number(exp.amount || 0);
      totalExpense += amt;
      const cat = exp.category || 'General';
      expenseCategoryMap.set(cat, (expenseCategoryMap.get(cat) || 0) + amt);

      // Add to timeline
      const expDate = new Date(new Date(exp.date || exp.createdAt).getTime() + 6 * 3600 * 1000);
      const dateKey = expDate.toISOString().split('T')[0];
      const day = timelineMap.get(dateKey) || { sales: 0, cogs: 0, expenses: 0, profit: 0, orders: 0 };
      day.expenses += amt;
      timelineMap.set(dateKey, day);
    });

    // Calculate Returns Value
    const totalReturns = returnOrders.reduce(
      (sum: number, o: any) => sum + Number(o.total_price || 0),
      0
    );

    // Final P&L Computations
    const grossProfit = Math.max(0, totalSales - totalCogs);
    const grossMarginPct = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netProfit = Math.max(0, grossProfit - totalExpense - totalReturns);
    const netMarginPct = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // Build timeline array sorted chronologically
    const timeline = Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const dayProfit = Math.max(0, data.sales - data.cogs - data.expenses);
        return {
          date,
          sales: Math.round(data.sales * 100) / 100,
          cogs: Math.round(data.cogs * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          profit: Math.round(dayProfit * 100) / 100,
          orders: data.orders,
        };
      });

    // Build payment method list
    const paymentNameBn: Record<string, string> = {
      CASH: 'নগদ ক্যাশ (Cash)',
      CARD: 'কার্ড পেমেন্ট (Card)',
      'BKASH / MFS': 'বিকাশ / মোবাইল ব্যাংকিং',
      'ONLINE GATEWAY': 'অনলাইন গেটওয়ে',
      'CASH ON DELIVERY': 'ক্যাশ অন ডেলিভারি (COD)',
      'DEPOSIT PAYMENT': 'ডিপোজিট / অগ্রিম',
    };

    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, val]) => ({
      method,
      name_bn: paymentNameBn[method] || method,
      total: Math.round(val.total * 100) / 100,
      count: val.count,
      pct: totalSales > 0 ? Math.round((val.total / totalSales) * 1000) / 10 : 0,
    }));

    // Build Expense Categories list
    const expensesByCategory = Array.from(expenseCategoryMap.entries()).map(([cat, amt]) => ({
      category: cat,
      amount: Math.round(amt * 100) / 100,
      pct: totalExpense > 0 ? Math.round((amt / totalExpense) * 1000) / 10 : 0,
    }));

    // Build Top 10 Profitable Products
    const topProducts = Array.from(topProductsMap.entries())
      .map(([pId, stat]) => {
        const profit = Math.max(0, stat.revenue - stat.cost);
        const marginPct = stat.revenue > 0 ? (profit / stat.revenue) * 100 : 0;
        return {
          product_id: pId,
          title: stat.title,
          thumbnail: stat.thumb,
          quantity: stat.qty,
          revenue: Math.round(stat.revenue * 100) / 100,
          cost: Math.round(stat.cost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          margin_pct: Math.round(marginPct * 10) / 10,
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    return {
      period: {
        startDate: formattedStart,
        endDate: formattedEnd,
        channel,
      },
      summary: {
        total_sales: Math.round(totalSales * 100) / 100,
        product_cost: Math.round(totalCogs * 100) / 100,
        gross_profit: Math.round(grossProfit * 100) / 100,
        gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
        total_expense: Math.round(totalExpense * 100) / 100,
        total_returns: Math.round(totalReturns * 100) / 100,
        total_discount: Math.round(totalDiscount * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        net_margin_pct: Math.round(netMarginPct * 10) / 10,
        total_orders: orders.length,
        total_items_sold: totalItemsSold,
        closing_stock_valuation: closingStock,
      },
      channels: {
        pos: {
          orders: posOrdersCount,
          revenue: Math.round(posRevenue * 100) / 100,
          pct: totalSales > 0 ? Math.round((posRevenue / totalSales) * 1000) / 10 : 0,
        },
        online: {
          orders: onlineOrdersCount,
          revenue: Math.round(onlineRevenue * 100) / 100,
          pct: totalSales > 0 ? Math.round((onlineRevenue / totalSales) * 1000) / 10 : 0,
        },
      },
      payment_breakdown: paymentBreakdown,
      timeline: timeline,
      expenses_by_category: expensesByCategory,
      top_products: topProducts,
    };
  }

  /**
   * Product-level Sales Report with pagination, search, category & brand filtering
   */
  async getProductSalesReport(query: {
    page?: number;
    per_page?: number;
    search?: string;
    category?: string;
    brand?: string;
    startDate?: string;
    endDate?: string;
    channel?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const perPage = Math.max(1, Number(query.per_page || 10));
    const channel = (query.channel || 'all').toLowerCase();
    const search = query.search ? query.search.trim() : '';

    // 1. Build Orders Date & Channel Filter
    const orderFilter: any = {
      order_status: { $nin: ['cancelled', 'returned'] },
    };

    if (query.startDate || query.endDate) {
      const { start, end } = this.parseBstDateRange(query.startDate, query.endDate);
      orderFilter.createdAt = { $gte: start, $lte: end };
    }

    if (channel === 'pos') {
      orderFilter.order_type = { $in: ['POS', 'pos'] };
    } else if (channel === 'online') {
      orderFilter.$or = [
        { order_type: { $in: ['ONLINE', 'online'] } },
        { order_type: { $exists: false } },
        { order_type: null },
      ];
    }

    // 2. Query Orders to Aggregate Sales Per Product
    const orders = await Order.find(orderFilter, { products: 1, items: 1, total_price: 1, order_type: 1 }).lean();

    const salesMap = new Map<
      string,
      {
        sold_qty: number;
        sold_amount: number;
        online_qty: number;
        online_amount: number;
        pos_qty: number;
        pos_amount: number;
      }
    >();

    orders.forEach((o: any) => {
      const isPos = String(o.order_type || '').toUpperCase() === 'POS';
      const items = o.products || o.items || [];
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const pId = String(it.product_id || '');
          if (!pId) return;

          const qty = Number(it.quantity || 1);
          const amount = Number(it.total_price || it.total || (it.price || 0) * qty);

          const existing = salesMap.get(pId) || {
            sold_qty: 0,
            sold_amount: 0,
            online_qty: 0,
            online_amount: 0,
            pos_qty: 0,
            pos_amount: 0,
          };

          existing.sold_qty += qty;
          existing.sold_amount += amount;

          if (isPos) {
            existing.pos_qty += qty;
            existing.pos_amount += amount;
          } else {
            existing.online_qty += qty;
            existing.online_amount += amount;
          }

          salesMap.set(pId, existing);
        });
      }
    });

    // 3. Build Product Query
    const productQuery: any = {};
    if (search) {
      productQuery.$or = [
        { product_title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (query.category && mongoose.isValidObjectId(query.category)) {
      productQuery.product_categories = query.category;
    }

    if (query.brand && mongoose.isValidObjectId(query.brand)) {
      productQuery.brand = query.brand;
    }

    // Fetch products, categories and brands in parallel without fragile populate cast errors
    const [productsDb, allCategories, allBrands] = await Promise.all([
      Product.find(productQuery).lean(),
      CategoryModel.find({}, { name: 1 }).lean(),
      BrandModel.find({}, { name: 1 }).lean(),
    ]);

    const categoryMap = new Map(allCategories.map((c: any) => [String(c._id), c.name]));
    const brandMap = new Map(allBrands.map((b: any) => [String(b._id), b.name]));

    // Map and calculate
    let allItems = productsDb.map((p: any) => {
      const pId = String(p._id);
      const sales = salesMap.get(pId) || {
        sold_qty: 0,
        sold_amount: 0,
        online_qty: 0,
        online_amount: 0,
        pos_qty: 0,
        pos_amount: 0,
      };

      // Category Name
      let categoryName = 'General';
      if (Array.isArray(p.product_categories) && p.product_categories.length > 0) {
        const catNames = p.product_categories
          .map((c: any) => {
            if (c && typeof c === 'object' && c.name) return c.name;
            return categoryMap.get(String(c)) || String(c);
          })
          .filter(Boolean);
        if (catNames.length > 0) categoryName = catNames.join(', ');
      }

      // Brand Name
      let brandName = 'MIMI SPHERE';
      if (p.brand) {
        if (typeof p.brand === 'object' && p.brand.name) {
          brandName = p.brand.name;
        } else if (typeof p.brand === 'string' && p.brand.trim()) {
          brandName = brandMap.get(p.brand) || p.brand;
        }
      }

      return {
        product_id: pId,
        sku: p.sku || `SKU-${pId.slice(-5).toUpperCase()}`,
        product_name: p.product_title || 'Unnamed Product',
        thumbnail: p.thumbnail || (Array.isArray(p.product_images) && p.product_images[0]) || '',
        brand: brandName,
        category: categoryName,
        sold_qty: sales.sold_qty,
        sold_amount: Math.round(sales.sold_amount * 100) / 100,
        online_qty: sales.online_qty,
        online_amount: Math.round(sales.online_amount * 100) / 100,
        pos_qty: sales.pos_qty,
        pos_amount: Math.round(sales.pos_amount * 100) / 100,
        instock_qty: Number(p.quantity || 0),
        unit_price: Number(p.product_price || 0),
      };
    });

    // Sort by sold quantity descending first, then by in-stock quantity
    allItems.sort((a, b) => b.sold_qty - a.sold_qty || b.sold_amount - a.sold_amount);

    // Compute Overall Summary
    const totalSoldQty = allItems.reduce((acc, item) => acc + item.sold_qty, 0);
    const totalSoldAmount = allItems.reduce((acc, item) => acc + item.sold_amount, 0);
    const totalOnlineQty = allItems.reduce((acc, item) => acc + item.online_qty, 0);
    const totalOnlineAmount = allItems.reduce((acc, item) => acc + item.online_amount, 0);
    const totalPosQty = allItems.reduce((acc, item) => acc + item.pos_qty, 0);
    const totalPosAmount = allItems.reduce((acc, item) => acc + item.pos_amount, 0);
    const totalItemsCount = allItems.length;
    const totalPages = Math.ceil(totalItemsCount / perPage) || 1;

    // Slice for pagination
    const startIndex = (page - 1) * perPage;
    const paginatedItems = allItems.slice(startIndex, startIndex + perPage);

    return {
      data: paginatedItems,
      pagination: {
        currentPage: page,
        perPage: perPage,
        totalItems: totalItemsCount,
        totalPages: totalPages,
      },
      summary: {
        total_sold_qty: totalSoldQty,
        total_sold_amount: Math.round(totalSoldAmount * 100) / 100,
        total_online_qty: totalOnlineQty,
        total_online_amount: Math.round(totalOnlineAmount * 100) / 100,
        total_pos_qty: totalPosQty,
        total_pos_amount: Math.round(totalPosAmount * 100) / 100,
        total_products_count: totalItemsCount,
      },
    };
  }

  /**
   * Purchase & Stock Inventory Report with pagination and valuation
   */
  async getPurchaseReport(query: {
    page?: number;
    per_page?: number;
    search?: string;
    category?: string;
    brand?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const perPage = Math.max(1, Number(query.per_page || 10));
    const search = query.search ? query.search.trim() : '';

    const productQuery: any = {};
    if (search) {
      productQuery.$or = [
        { product_title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (query.category && mongoose.isValidObjectId(query.category)) {
      productQuery.product_categories = query.category;
    }

    if (query.brand && mongoose.isValidObjectId(query.brand)) {
      productQuery.brand = query.brand;
    }

    if (query.startDate || query.endDate) {
      const { start, end } = this.parseBstDateRange(query.startDate, query.endDate);
      productQuery.createdAt = { $gte: start, $lte: end };
    }

    const totalItemsCount = await Product.countDocuments(productQuery);
    const totalPages = Math.ceil(totalItemsCount / perPage) || 1;

    const [products, allCategories, allBrands] = await Promise.all([
      Product.find(productQuery)
        .sort({ quantity: -1, createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
      CategoryModel.find({}, { name: 1 }).lean(),
      BrandModel.find({}, { name: 1 }).lean(),
    ]);

    const categoryMap = new Map(allCategories.map((c: any) => [String(c._id), c.name]));
    const brandMap = new Map(allBrands.map((b: any) => [String(b._id), b.name]));

    // Compute global summary across all items matching productQuery
    const [summaryAgg] = await Product.aggregate([
      { $match: productQuery },
      {
        $project: {
          qty: { $ifNull: ["$quantity", 0] },
          cost: {
            $cond: [
              { $gt: ["$cost_price", 0] },
              "$cost_price",
              { $multiply: [{ $ifNull: ["$product_price", 0] }, 0.7] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total_stock_qty: { $sum: "$qty" },
          total_stock_valuation: { $sum: { $multiply: ["$qty", "$cost"] } },
        },
      },
    ]);

    const data = products.map((p: any) => {
      const pId = String(p._id);
      const qty = Number(p.quantity || 0);
      const cost = Number(p.cost_price > 0 ? p.cost_price : (p.product_price || 0) * 0.7);
      const valuation = Math.round(qty * cost * 100) / 100;

      // Category Name
      let categoryName = 'General';
      if (Array.isArray(p.product_categories) && p.product_categories.length > 0) {
        const catNames = p.product_categories
          .map((c: any) => {
            if (c && typeof c === 'object' && c.name) return c.name;
            return categoryMap.get(String(c)) || String(c);
          })
          .filter(Boolean);
        if (catNames.length > 0) categoryName = catNames.join(', ');
      }

      // Brand Name
      let brandName = 'MIMI SPHERE';
      if (p.brand) {
        if (typeof p.brand === 'object' && p.brand.name) {
          brandName = p.brand.name;
        } else if (typeof p.brand === 'string' && p.brand.trim()) {
          brandName = brandMap.get(p.brand) || p.brand;
        }
      }

      const status: 'In Stock' | 'Low Stock' | 'Out of Stock' =
        qty > 10 ? 'In Stock' : qty > 0 ? 'Low Stock' : 'Out of Stock';

      return {
        product_id: pId,
        sku: p.sku || `SKU-${pId.slice(-5).toUpperCase()}`,
        product_name: p.product_title || 'Unnamed Product',
        thumbnail: p.thumbnail || (Array.isArray(p.product_images) && p.product_images[0]) || '',
        brand: brandName,
        category: categoryName,
        unit_cost: Math.round(cost * 100) / 100,
        unit_price: Number(p.product_price || 0),
        instock_qty: qty,
        total_stock_value: valuation,
        stock_status: status,
      };
    });

    return {
      data,
      pagination: {
        currentPage: page,
        perPage,
        totalItems: totalItemsCount,
        totalPages,
      },
      summary: {
        total_stock_qty: summaryAgg?.total_stock_qty || 0,
        total_stock_valuation: Math.round((summaryAgg?.total_stock_valuation || 0) * 100) / 100,
        total_items_count: totalItemsCount,
      },
    };
  }
}


export const reportsService = new ReportsService();
