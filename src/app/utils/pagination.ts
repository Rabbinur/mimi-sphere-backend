export const paginate = async (
  model: any,
  searchQuery: any,
  page: number,
  limit: number,
  sortQuery: any = { createdAt: -1 }, // default: latest
  populate: string | any = null,
) => {
  const skip = (page - 1) * limit;

  let query = model
    .find(searchQuery)
    .sort(sortQuery)
    .select('-password -otp -otpExpiry -__v')
    .skip(skip)
    .limit(limit);

  if (populate) {
    query = query.populate(populate);
  }

  // 🔥 Parallel Execution & .lean() for significant speed boost
  const [data, totalItems] = await Promise.all([
    query.lean(),
    model.countDocuments(searchQuery).lean(),
  ]);

  return {
    data,
    pagination: {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      limit,
    },
  };
};
