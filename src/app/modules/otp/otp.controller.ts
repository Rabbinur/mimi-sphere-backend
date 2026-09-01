import { Request, Response } from 'express';

import { OTPService } from './otp.service';
import BaseController from '../../shared/baseController';
import { HttpStatusCode } from '../../../lib/httpStatus';

class Controller extends BaseController {
  resendOtp = this.catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    await OTPService.sendAccountVerificationOtp(email);
    this.sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message:
        "We've sent a verification code to your email. Please verify to access your account",
      data: null,
    });
  });

  verifyOtp = this.catchAsync(async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const data = await OTPService.verifyOTP(email, otp);
    this.sendResponse(res, {
      statusCode: HttpStatusCode.OK,
      success: true,
      message: 'Congratulations! Your account has been verified',
      data,
    });
  });

  verifyForgetPasswordOTP = this.catchAsync(
    async (req: Request, res: Response) => {
      const { email, otp } = req.body;
      await OTPService.verifyForgetPasswordOTP(email, otp);
      this.sendResponse(res, {
        statusCode: HttpStatusCode.OK,
        success: true,
        message: 'Your OTP has been verified. You can proceed',
        data: null,
      });
    },
  );
}

export const OTPController = new Controller();
