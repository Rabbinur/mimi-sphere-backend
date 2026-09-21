export interface IReportQuery {
  startDate?: string;
  endDate?: string;
  channel?: 'all' | 'pos' | 'online';
}

export interface IFinancialStatement {
  // Period & Metadata
  period: {
    startDate: string;
    endDate: string;
    channel: string;
  };

  // Executive KPI Summary
  summary: {
    total_sales: number; // Gross Revenue
    product_cost: number; // Cost of Goods Sold (COGS)
    gross_profit: number; // total_sales - product_cost
    gross_margin_pct: number; // (gross_profit / total_sales) * 100
    total_expense: number; // Store operational expenses
    total_returns: number; // Value of returned goods
    total_discount: number; // Discounts given
    net_profit: number; // gross_profit - total_expense - total_returns
    net_margin_pct: number; // (net_profit / total_sales) * 100
    total_orders: number;
    total_items_sold: number;
    closing_stock_valuation: number; // Live asset value in inventory
  };

  // Channel Distribution
  channels: {
    pos: {
      orders: number;
      revenue: number;
      pct: number;
    };
    online: {
      orders: number;
      revenue: number;
      pct: number;
    };
  };

  // Payment Breakdown
  payment_breakdown: Array<{
    method: string;
    name_bn: string;
    total: number;
    count: number;
    pct: number;
  }>;

  // Daily Timeline for Trend Charts
  timeline: Array<{
    date: string;
    sales: number;
    cogs: number;
    expenses: number;
    profit: number;
    orders: number;
  }>;

  // Category-wise Store Expenses
  expenses_by_category: Array<{
    category: string;
    amount: number;
    pct: number;
  }>;

  // Top 10 Profitable Products
  top_products: Array<{
    product_id: string;
    title: string;
    thumbnail?: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    margin_pct: number;
  }>;
}

export interface IProductSalesReportQuery {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  brand?: string;
  startDate?: string;
  endDate?: string;
  channel?: 'all' | 'pos' | 'online';
}

export interface IProductSalesItem {
  product_id: string;
  sku: string;
  product_name: string;
  thumbnail: string;
  brand: string;
  category: string;
  sold_qty: number;
  sold_amount: number;
  instock_qty: number;
  unit_price: number;
}

export interface IProductSalesReportResponse {
  data: IProductSalesItem[];
  pagination: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    total_sold_qty: number;
    total_sold_amount: number;
    total_products_count: number;
  };
}

export interface IPurchaseReportQuery {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  brand?: string;
}

export interface IPurchaseReportItem {
  product_id: string;
  sku: string;
  product_name: string;
  thumbnail: string;
  brand: string;
  category: string;
  unit_cost: number;
  unit_price: number;
  instock_qty: number;
  total_stock_value: number;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface IPurchaseReportResponse {
  data: IPurchaseReportItem[];
  pagination: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    total_stock_qty: number;
    total_stock_valuation: number;
    total_items_count: number;
  };
}
