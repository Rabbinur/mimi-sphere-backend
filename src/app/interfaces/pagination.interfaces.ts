export type IPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type IFilterRequest = {
  search_query?: string;
  max_price?: number;
  min_price?: number;
  offer?: string;
  is_published?: boolean;
  tags?: string[];
  category_id?: string;
  stock?: "in" | "out";
  free_delivery?: string;
};
