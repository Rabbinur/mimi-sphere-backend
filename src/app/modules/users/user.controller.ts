import { Request, Response } from 'express';

import { UserService } from './user.service';
import { paginationFields } from '../../constants/paginationFields';
import BaseController from '../../shared/baseController';
import pickQueries from '../../shared/pickQueries';

class Controller extends BaseController {
  registerUser = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.registerUser(req.body);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        'Your account has been created successfully. Please verify your email to access your account. Please check your email.',
      data: data,
    });
  });

  loginUser = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.loginUser(req.body);
    const { access_token, refresh_token, ...userData } = data;

    // Set Tokens in Cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      secure: isProduction, // Must be true if sameSite is 'none'
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      domain: isProduction ? '.shoppingcart.bd' : undefined,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    res.cookie('refreshToken', refresh_token, cookieOptions);
    res.cookie('accessToken', access_token, {
      ...cookieOptions,
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });

    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User login successfully',
      data: {
        ...userData,
        access_token,
        refresh_token,
      },
    });
  });

  googleLogin = this.catchAsync(async (req: Request, res: Response) => {
    const { access_token: google_token } = req.body;
    const data = await UserService.googleLogin(google_token);
    const { access_token, refresh_token, ...userData } = data;

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      domain: isProduction ? '.shoppingcart.bd' : undefined,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };

    res.cookie('refreshToken', refresh_token, cookieOptions);
    res.cookie('accessToken', access_token, {
      ...cookieOptions,
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User logged in successfully via Google',
      data: {
        ...userData,
        access_token,
        refresh_token,
      },
    });
  });

  getAllUser = this.catchAsync(async (req: Request, res: Response) => {
    const options = pickQueries(req.query, paginationFields);
    const data = await UserService.getAllUser(
      options,
      req.query.search_query as string,
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Users find successfully',
      data: data,
    });
  });

  getUserByToken = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.getUserByToken(req?.user?.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User find successfully',
      data: data,
    });
  });

  getUserById = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.getUserById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User find successfully',
      data: data,
    });
  });

  updateUser = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.updateUser(req.params.id, req.body);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User updated successfully',
      data: data,
    });
  });

  changePasswordByUserId = this.catchAsync(
    async (req: Request, res: Response) => {
      const data = await UserService.changePasswordByUserId(
        req.params.id,
        req.body,
      );
      this.sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'User password updated successfully',
        data: data,
      });
    },
  );

  deleteUser = this.catchAsync(async (req: Request, res: Response) => {
    await UserService.deleteUser(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User deleted successfully',
      data: null,
    });
  });

  forgetPassword = this.catchAsync(async (req: Request, res: Response) => {
    await UserService.forgetPassword(req.body.email);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        "We've sent a verification code to your email. Please check you mailbox or span folder",
      data: null,
    });
  });

  resetPassword = this.catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const data = await UserService.resetPassword(email, password);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Your password has been reset and authenticated successfully',
      data,
    });
  });

  refreshToken = this.catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    const result = await UserService.refreshToken(refreshToken);
    const { access_token, refresh_token } = result;

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      domain: isProduction ? '.shoppingcart.bd' : undefined,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };

    res.cookie('refreshToken', refresh_token, cookieOptions);
    res.cookie('accessToken', access_token, {
      ...cookieOptions,
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  });

  authCheck = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.getUserByToken(req?.user?.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Auth check successfully',
      data: data,
    });
  });

  updateMyProfile = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.updateUser(req.user.id, req.body);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Profile updated successfully',
      data: data,
    });
  });

  changeMyPassword = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.changePasswordByUserId(
      req.user.id,
      req.body,
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Password updated successfully',
      data: data,
    });
  });

  dbOverview = this.catchAsync(async (req: Request, res: Response) => {
    const data = await UserService.dbOverview();
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Database overview retrieved successfully',
      data: data,
    });
  });

  logout = this.catchAsync(async (req: Request, res: Response) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      domain: isProduction ? '.shoppingcart.bd' : undefined,
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'User logged out successfully',
      data: null,
    });
  });
}

export const UserController = new Controller();
