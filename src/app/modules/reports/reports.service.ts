import mongoose from 'mongoose';
import { OrderModel as Order } from '../orders/order.model';
import { Product } from '../products/product.model';
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
}

export const reportsService = new ReportsService();
