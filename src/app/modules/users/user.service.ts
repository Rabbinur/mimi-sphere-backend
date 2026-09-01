import { IUser } from './user.interface';
import User from './user.model';
import { OrderModel as Order, SuccessOrderModel as SuccessOrder } from '../orders/order.model';
import { Product } from '../products/product.model';
import { CategoryModel as Category } from '../category/category.model';
import ApiError from '../../middlewares/error';
import { Utils } from './user.utils';
import JwtHelpers from '../../helpers/jwtHelpers';
import { Secret } from 'jsonwebtoken';
import { IPaginationOptions } from '../../interfaces/pagination.interfaces';
import { paginationHelpers } from '../../helpers/paginationHelpers';
import { OTPService } from '../otp/otp.service';
import { UserMailService } from '../../email/user.mail';

import config from '../../config';
import { HttpStatusCode } from '../../../lib/httpStatus';

class Service {
  async registerUser(data: IUser) {
    const isExist = await User.findOne({
      email: data.email,
    });

    if (isExist) {
      throw new ApiError(
        HttpStatusCode.CONFLICT,
        'You have already an account with this email. Please try to login',
      );
    }

    if (data?.role && data?.role !== 'USER') {
      throw new ApiError(
        HttpStatusCode.FORBIDDEN,
        'You are not allowed to register others role.',
      );
    }

    const hashedPassword = await Utils.hash(data?.password);
    data.password = hashedPassword;

    const result = await User.create(data);

    // send verification email first time
    await OTPService.sendAccountVerificationOtp(data.email, data.name);

    return result;
  }

  async loginUser(payload: { email: string; password: string }) {
    const isUserExist = await User.findOne({
      email: payload.email,
    });

    if (!isUserExist) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'User was not found with this email. Please create an account first',
      );
    }

    if (isUserExist.isVerified === false) {
      // send verification email first time
      await OTPService.sendAccountVerificationOtp(
        isUserExist.email,
        isUserExist.name,
      );
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "Your account is not verified yet. We've sent a verification code to your email. Please check your email.",
      );
    }

    const passwordMatch = await Utils.compare(
      payload?.password,
      isUserExist?.password,
    );
    if (!passwordMatch) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        'Invalid credentials. Please try with valid email and password',
      );
    }

    const jwtPayload = {
      id: isUserExist?.id,
      email: isUserExist?.email,
      role: isUserExist?.role,
    };

    const access_token = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_access_secret as Secret,
      config.jwt_access_expires_in as string,
    );

    const refresh_token = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_refresh_secret as Secret,
      config.jwt_refresh_expires_in as string,
    );

    const user = await User.findOne({
      email: payload.email,
    }).select({ password: 0 });

    return {
      data: user,
      access_token,
      refresh_token,
    };
  }

  async googleLogin(access_token: string) {
    // 1. Verify token with Google and get user info
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );

    if (!response.ok) {
      throw new ApiError(HttpStatusCode.UNAUTHORIZED, 'Invalid Google token');
    }

    const googleUser = await response.json();
    const { email, name, picture } = googleUser;

    if (!email) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        'Email not provided by Google',
      );
    }

    // 2. Check if user exists
    let user = await User.findOne({ email });

    // 3. If not, create them
    if (!user) {
      const randomPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = await Utils.hash(randomPassword);

      user = await User.create({
        email,
        name,
        photo: picture,
        password: hashedPassword,
        isVerified: true,
        role: 'USER',
      });
    }

    // 4. Generate tokens
    const jwtPayload = {
      id: user?.id,
      email: user?.email,
      role: user?.role,
    };

    const newAccessToken = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_access_secret as Secret,
      config.jwt_access_expires_in as string,
    );

    const newRefreshToken = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_refresh_secret as Secret,
      config.jwt_refresh_expires_in as string,
    );

    const userData = await User.findById(user._id).select({ password: 0 });

    return {
      data: userData,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async getAllUser(options: IPaginationOptions, search_query: string) {
    const {
      limit,
      page,
      skip,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = paginationHelpers.calculatePagination(options);

    const searchCondition: any = {};
    if (search_query) {
      searchCondition.$or = [
        { name: { $regex: search_query, $options: 'i' } },
        { phone_number: { $regex: search_query, $options: 'i' } },
        { email: { $regex: search_query, $options: 'i' } },
      ];
    }

    const result = await User.find({ ...searchCondition, role: 'USER' })
      .select({ password: 0 })
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(searchCondition);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: result,
    };
  }
  async getUserByToken(_id: string) {
    const user = await User.findById(_id).select({ password: 0 });
    if (!user) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        'User was not found! You may clear you session or re-login',
      );
    }

    // Get Order Stats
    const activeOrders = await Order.find({ email: user.email });
    const successOrders = await SuccessOrder.find({ email: user.email });
    const orders = [...activeOrders, ...successOrders];

    const orderStats = {
      placed_orders: orders.filter((o: any) => o.order_status === 'pending')
        .length,
      to_ship_orders: orders.filter((o: any) => o.order_status === 'processing')
        .length,
      to_received_orders: orders.filter(
        (o: any) => o.order_status === 'shipped',
      ).length,
      delivered_orders: orders.filter(
        (o: any) => o.order_status === 'delivered',
      ).length,
      cancelled_orders: orders.filter((o: any) => o.order_status === 'canceled')
        .length,
      total_orders: orders.length,
    };

    const activeRecent = await Order.find({ email: user.email })
      .sort({ createdAt: -1 })
      .limit(5);
    const successRecent = await SuccessOrder.find({ email: user.email })
      .sort({ createdAt: -1 })
      .limit(5);
    const recentOrders = [...activeRecent, ...successRecent]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      ...user.toObject(),
      orderStats,
      recentOrders,
    };
  }

  async getUserById(id: string) {
    const result = await User.findById(id).select({ password: 0 });
    if (!result) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'User was not found. Please provide a valid user id',
      );
    }
    return result;
  }

  async changePasswordByUserId(user_id: string, payload: any) {
    const isUserExist = await User.findById(user_id);

    if (!isUserExist) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'User not found');
    }

    const oldPassword = payload?.oldPassword || payload?.old_password;
    const newPasswordRaw = payload?.newPassword || payload?.new_password;

    const isPasswordMatch = await Utils.compare(
      oldPassword,
      isUserExist?.password,
    );

    if (!isPasswordMatch) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        'Old password does not match',
      );
    }

    const newPassword = await Utils.hash(newPasswordRaw);

    const result = await User.findByIdAndUpdate(
      user_id,
      {
        password: newPassword,
      },
      {
        new: true,
      },
    );

    // send password change notification
    await UserMailService.sendPasswordChangeNotification(
      isUserExist.email,
      isUserExist.name,
    );

    return result;
  }

  async updateUser(id: string, payload: any) {
    const isUserExist = await User.findById(id);
    if (!isUserExist) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "We couldn't find user with this id. Please try update with a valid user id",
      );
    }

    if (payload?.password || payload?.email) {
      delete payload?.password;
      delete payload?.email;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true },
    ).select('-password');

    return updatedUser;
  }

  async deleteUser(user_id: string) {
    const isUserExist = await User.findById(user_id);

    if (!isUserExist) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'User not exist');
    }

    await User.findByIdAndDelete(user_id).select({ _id: 1 });
  }

  async forgetPassword(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'User was not found');
    }
    // send
    await OTPService.generateForgetPasswordOtp(user.name, user.email);
  }

  async resetPassword(email: string, password: string) {
    const isUserExist = await User.findOne({ email });

    if (!isUserExist) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'User was not found with this email. Please create an account first',
      );
    }

    const newPassword = await Utils.hash(password);

    await User.findByIdAndUpdate(isUserExist._id, { password: newPassword });

    // send password change notification
    await UserMailService.sendPasswordChangeNotification(
      email,
      isUserExist.name,
    );

    const jwtPayload = {
      id: isUserExist?.id,
      email: isUserExist?.email,
      role: isUserExist?.role,
    };

    const access_token = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_access_secret as Secret,
      config.jwt_access_expires_in as string,
    );

    const refresh_token = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_refresh_secret as Secret,
      config.jwt_refresh_expires_in as string,
    );

    const user = await User.findById(isUserExist._id).select({ password: 0 });

    return {
      data: user,
      access_token,
      refresh_token,
    };
  }

  async refreshToken(token: string) {
    let verifiedToken = null;
    try {
      verifiedToken = JwtHelpers.verifyToken(
        token,
        config.jwt_refresh_secret as Secret,
      );
    } catch (err) {
      throw new ApiError(HttpStatusCode.FORBIDDEN, 'Invalid Refresh Token');
    }

    const { id } = verifiedToken;

    const isUserExist = await User.findById(id);
    if (!isUserExist) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, 'User does not exist');
    }

    const jwtPayload = {
      id: isUserExist.id,
      email: isUserExist.email,
      role: isUserExist.role,
    };

    const newAccessToken = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_access_secret as Secret,
      config.jwt_access_expires_in as string,
    );

    const newRefreshToken = JwtHelpers.createToken(
      jwtPayload,
      config.jwt_refresh_secret as Secret,
      config.jwt_refresh_expires_in as string,
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async dbOverview() {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    const lowStockProducts = await Product.countDocuments({
      quantity: { $lt: 10 },
    });

    const activeOrders = await Order.find({});
    const successOrders = await SuccessOrder.find({});
    const allOrders = [...activeOrders, ...successOrders];
    const totalOrders = allOrders.length;

    const orderStatus = {
      pending: allOrders.filter((o: any) => o.order_status === 'pending')
        .length,
      processing: allOrders.filter((o: any) => o.order_status === 'processing')
        .length,
      shipped: allOrders.filter((o: any) => o.order_status === 'shipped')
        .length,
      delivered: allOrders.filter((o: any) => o.order_status === 'delivered')
        .length,
      canceled: allOrders.filter((o: any) => o.order_status === 'canceled')
        .length,
    };

    const paidOrders = allOrders.filter(
      (o: any) => o.payment_status === 'paid',
    );
    const totalRevenue = paidOrders.reduce(
      (acc, order) => acc + (order.total_price || 0),
      0,
    );

    const activeRecent = await Order.find({}).sort({ createdAt: -1 }).limit(10);
    const successRecent = await SuccessOrder.find({}).sort({ createdAt: -1 }).limit(10);
    const recentOrders = [...activeRecent, ...successRecent]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Chart data (last 7 days)
    const chart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRevenue = paidOrders
        .filter((o: any) => {
          const d = new Date(o.createdAt);
          return d >= dayStart && d <= dayEnd;
        })
        .reduce((acc, order) => acc + (order.total_price || 0), 0);

      chart.push({ date: dateString, revenue: dayRevenue });
    }

    return {
      totalUsers,
      orders: {
        totalOrders,
        status: orderStatus,
      },
      revenue: {
        totalRevenue,
      },
      products: {
        activeProducts: totalProducts,
        lowStockProducts,
      },
      categories: {
        totalCategories,
      },
      recentOrders,
      chart,
    };
  }
}

export const UserService = new Service();
