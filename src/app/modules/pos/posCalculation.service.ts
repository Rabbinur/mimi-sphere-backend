import mongoose from 'mongoose';
import { OrderModel as Order } from '../orders/order.model';
import { Product } from '../products/product.model';
import { PosExpense } from './posExpense.model';
import { PosStockAdjustment } from './posStockAdjustment.model';

class PosCalculationService {
  /**
   * Calculate Start and End of day timestamps in Bangladesh Standard Time (UTC+6)
   */
  getBangladeshDateRange(dateStr?: string) {
    let startOfDay: Date;
    let endOfDay: Date;

    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      startOfDay = new Date(`${dateStr.trim()}T00:00:00.000+06:00`);
      endOfDay = new Date(`${dateStr.trim()}T23:59:59.999+06:00`);
    } else {
      const now = new Date();
      // BST is UTC + 6 hours
      const bstOffset = 6 * 60 * 60 * 1000;
      const bstDate = new Date(now.getTime() + bstOffset);
      const year = bstDate.getUTCFullYear();
      const month = String(bstDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(bstDate.getUTCDate()).padStart(2, '0');

      startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000+06:00`);
      endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999+06:00`);
    }

    return { startOfDay, endOfDay };
  }

  /**
   * Live inventory closing valuation calculation
   */
  async calculateClosingStock(): Promise<number> {
    try {
      const inventory = await Product.aggregate([
        {
          $project: {
            stockValue: {
              $multiply: [
                { $ifNull: ['$quantity', 0] },
                {
                  $cond: [
                    { $gt: ['$cost_price', 0] },
                    '$cost_price',
                    { $ifNull: ['$product_price', 0] },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalValuation: { $sum: '$stockValue' },
          },
        },
      ]);
      return Math.round((inventory[0]?.totalValuation || 0) * 100) / 100;
    } catch {
      return 0;
    }
  }

  /**
   * Compute actual cost of goods sold based on product & variant cost_price in DB
   */
  async calculateOrdersCost(orders: any[]): Promise<number> {
    const productIds = new Set<string>();
    orders.forEach((o) => {
      const items = o.products || o.items || [];
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          if (it.product_id && mongoose.isValidObjectId(it.product_id)) {
            productIds.add(String(it.product_id));
          }
        });
      }
    });

    if (productIds.size === 0) return 0;

    const productsDb = await Product.find(
      { _id: { $in: Array.from(productIds) } },
      { cost_price: 1, product_price: 1, product_variants: 1 }
    ).lean();

    const costMap = new Map<string, number>();
    productsDb.forEach((p: any) => {
      costMap.set(String(p._id), Number(p.cost_price || 0));
      if (Array.isArray(p.product_variants)) {
        p.product_variants.forEach((v: any) => {
          if (v._id) {
            costMap.set(String(v._id), Number(v.cost_price ?? p.cost_price ?? 0));
          }
        });
      }
    });

    let totalCost = 0;
    orders.forEach((o) => {
      const items = o.products || o.items || [];
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const qty = Number(it.quantity || 1);
          const matchedCost =
            (it.variant_id && costMap.get(String(it.variant_id))) ||
            costMap.get(String(it.product_id));
          const unitCost =
            matchedCost !== undefined && matchedCost > 0
              ? matchedCost
              : Number(it.price || 0) * 0.7;
          totalCost += unitCost * qty;
        });
      }
    });

    return Math.round(totalCost * 100) / 100;
  }

  /**
   * 1. Strictly POS Counter Shift & Cash Register Summary
   * Filters ONLY order_type: 'POS'
   */
  async calculatePosShiftSummary(dateStr?: string) {
    const { startOfDay, endOfDay } = this.getBangladeshDateRange(dateStr);

    const [posOrders, posReturns, todayExpenses] = await Promise.all([
      Order.find({
        order_type: 'POS',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).lean(),
      Order.find({
        order_type: 'POS',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        $or: [{ order_status: 'returned' }, { payment_status: 'refunded' }],
      }).lean(),
      PosExpense.find({
        date: { $gte: startOfDay, $lte: endOfDay },
      }).lean(),
    ]);

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let digitalSales = 0;
    let totalDiscount = 0;
    let totalItemsSold = 0;
    let depositPayment = 0;

    posOrders.forEach((o: any) => {
      const total = Number(o.total_price || 0);
      totalSales += total;
      totalDiscount += Number(o.discount_amount || o.discount || 0);

      const pm = String(o.payment_method || '').toUpperCase();
      if (pm.includes('CASH')) {
        cashSales += total;
      } else if (pm.includes('CARD')) {
        cardSales += total;
      } else if (pm.includes('DEPOSIT')) {
        depositPayment += total;
      } else {
        digitalSales += total;
      }

      const items = o.products || o.items || [];
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          totalItemsSold += Number(it.quantity || 1);
        });
      }
    });

    const totalReturns = posReturns.reduce(
      (sum: number, o: any) => sum + Number(o.total_price || 0),
      0
    );
    const totalExpense = todayExpenses.reduce(
      (sum: number, exp: any) => sum + Number(exp.amount || 0),
      0
    );
    const productCost = await this.calculateOrdersCost(posOrders);
    const closingStock = await this.calculateClosingStock();
    const netProfit = Math.max(0, totalSales - productCost - totalExpense - totalReturns);

    return {
      date: startOfDay.toISOString().split('T')[0],
      order_type: 'POS',
      total_orders: posOrders.length,
      total_sales: Math.round(totalSales * 100) / 100,
      product_revenue: Math.round(totalSales * 100) / 100,
      cash_sales: Math.round(cashSales * 100) / 100,
      card_sales: Math.round(cardSales * 100) / 100,
      digital_sales: Math.round(digitalSales * 100) / 100,
      total_discount: Math.round(totalDiscount * 100) / 100,
      total_sell_discount: Math.round(totalDiscount * 100) / 100,
      total_items_sold: totalItemsSold,
      product_cost: productCost,
      net_profit: Math.round(netProfit * 100) / 100,
      total_profit: Math.round(netProfit * 100) / 100,
      closing_stock: closingStock,
      cash_in_hand: Math.round(Math.max(0, cashSales - totalExpense) * 100) / 100,
      total_payment: Math.round(totalSales * 100) / 100,
      total_expense: Math.round(totalExpense * 100) / 100,
      total_returns: Math.round(totalReturns * 100) / 100,
      total_sell_return: Math.round(totalReturns * 100) / 100,
      deposit_payment: Math.round(depositPayment * 100) / 100,
    };
  }

  /**
   * 2. Dedicated Today's Profit Analytics
   * Supports Channel Isolation: 'all' | 'pos' | 'online'
   */
  async calculateTodayProfit(query?: { channel?: string; date?: string }) {
    const { startOfDay, endOfDay } = this.getBangladeshDateRange(query?.date);
    const channel = (query?.channel || 'all').toLowerCase();

    const orderFilter: any = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    if (channel === 'pos') {
      orderFilter.order_type = 'POS';
    } else if (channel === 'online') {
      orderFilter.order_type = 'ONLINE';
    }

    const [matchingOrders, allTodayOrders, returnOrders, todayExpenses, todayStockAdjustments] =
      await Promise.all([
        Order.find(orderFilter).lean(),
        Order.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } }).lean(),
        Order.find({
          ...(channel === 'pos' ? { order_type: 'POS' } : channel === 'online' ? { order_type: 'ONLINE' } : {}),
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          $or: [{ order_status: 'returned' }, { payment_status: 'refunded' }],
        }).lean(),
        PosExpense.find({
          date: { $gte: startOfDay, $lte: endOfDay },
        }).lean(),
        PosStockAdjustment.find({
          date: { $gte: startOfDay, $lte: endOfDay },
        }).lean(),
      ]);

    let totalSales = 0;
    let posSales = 0;
    let onlineSales = 0;
    let posOrdersCount = 0;
    let onlineOrdersCount = 0;
    let totalDiscount = 0;
    let totalShippingCost = 0;
    let depositPayment = 0;

    allTodayOrders.forEach((o: any) => {
      const price = Number(o.total_price || 0);
      if (String(o.order_type).toUpperCase() === 'POS') {
        posSales += price;
        posOrdersCount += 1;
      } else {
        onlineSales += price;
        onlineOrdersCount += 1;
      }
    });

    matchingOrders.forEach((o: any) => {
      totalSales += Number(o.total_price || 0);
      totalDiscount += Number(o.discount_amount || o.discount || 0);
      totalShippingCost += Number(o.delivery_charge || 0);

      const pm = String(o.payment_method || '').toUpperCase();
      if (pm.includes('DEPOSIT')) {
        depositPayment += Number(o.total_price || 0);
      }
    });

    const [productCost, closingStock] = await Promise.all([
      this.calculateOrdersCost(matchingOrders),
      this.calculateClosingStock(),
    ]);

    const totalExpense = todayExpenses.reduce(
      (sum: number, exp: any) => sum + Number(exp.amount || 0),
      0
    );
    const totalReturns = returnOrders.reduce(
      (sum: number, o: any) => sum + Number(o.total_price || 0),
      0
    );
    const totalStockAdjustment = todayStockAdjustments.reduce(
      (sum: number, adj: any) => sum + Number(adj.cost_value || 0),
      0
    );

    const netProfit = Math.max(
      0,
      totalSales - productCost - totalExpense - totalReturns
    );

    return {
      date: startOfDay.toISOString().split('T')[0],
      channel: channel,
      total_orders: matchingOrders.length,
      total_sales: Math.round(totalSales * 100) / 100,
      product_revenue: Math.round(totalSales * 100) / 100,
      product_cost: productCost,
      total_expense: Math.round(totalExpense * 100) / 100,
      total_stock_adjustment: Math.round(totalStockAdjustment * 100) / 100,
      deposit_payment: Math.round(depositPayment * 100) / 100,
      total_purchase_shipping_cost: Math.round(totalShippingCost * 100) / 100,
      total_sell_discount: Math.round(totalDiscount * 100) / 100,
      total_sell_return: Math.round(totalReturns * 100) / 100,
      closing_stock: closingStock,
      total_profit: Math.round(netProfit * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      breakdown: {
        pos_sales: Math.round(posSales * 100) / 100,
        online_sales: Math.round(onlineSales * 100) / 100,
        pos_orders_count: posOrdersCount,
        online_orders_count: onlineOrdersCount,
      },
    };
  }
}

export const posCalculationService = new PosCalculationService();
