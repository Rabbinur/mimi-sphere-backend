import { Secret } from 'jsonwebtoken';
import JwtHelpers from '../../helpers/jwtHelpers';

import ApiError from '../../middlewares/error';
import User from '../users/user.model';
import OTPRecords from './otp.model';
import { HttpStatusCode } from '../../../lib/httpStatus';
import { UserMailService } from '../../email/user.mail';
import config from '../../config';

class Service {
  async sendAccountVerificationOtp(email: string, name?: string) {
    const isExist = await OTPRecords.findOne({ email });
    if (isExist) {
      await OTPRecords.deleteOne({ email });
    }
    const otp = await this.generateOtp();
    await OTPRecords.create({ email, otp });
    // send email
    console.log(
      `A new user registered. New otp ${otp} has been sent to ${email}`,
    );
    await UserMailService.sendAccountVerificationOtp(email, otp, name);
  }

  async verifyOTP(email: string, otp: number) {
    const isUserExist = await User.findOne({ email });
    if (!isUserExist) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'User was not found with this email. Please create an account first',
      );
    }

    if (isUserExist?.isVerified === true) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        'Your account already verified. Please login to your account',
      );
    }
    const otpRecord = await OTPRecords.findOne({
      email,
    });

    if (!otpRecord) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'Your otp verification time has been expired. Please resend otp',
      );
    }

    if (Number(otpRecord?.otp) !== Number(otp)) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        'Your provided otp was wrong. Please try with correct otp',
      );
    }

    await User.updateOne({ email }, { isVerified: true });

    // send welcome email
    await UserMailService.sendWelcomeEmail(email, isUserExist.name);

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

    const user = await User.findById(isUserExist?._id).select({ password: 0 });

    // delete the otp
    await OTPRecords.deleteOne({
      email,
    });

    // send tokens
    return {
      data: user,
      access_token,
      refresh_token,
    };
  }

  async verifyForgetPasswordOTP(email: string, otp: number) {
    const isUserExist = await User.findOne({ email });
    if (!isUserExist) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'User was not found with this email. Please create an account first',
      );
    }

    const otpRecord = await OTPRecords.findOne({
      email,
    });

    if (!otpRecord) {
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        'Your otp verification time has been expired. Please resend otp',
      );
    }

    if (Number(otpRecord?.otp) !== Number(otp)) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        'Your provided otp was wrong. Please try with correct otp',
      );
    }

    // delete the otp
    await OTPRecords.deleteOne({
      email,
    });
  }

  async generateForgetPasswordOtp(name: string, email: string): Promise<void> {
    const isExist = await OTPRecords.findOne({ email });
    if (isExist) {
      await OTPRecords.deleteOne({ email });
    }
    const otp = await this.generateOtp();
    await OTPRecords.create({ email, otp });
    // send email
    await UserMailService.sendForgetPasswordEmail(email, otp, name);
  }

  private async generateOtp(): Promise<number> {
    return Math.floor(100000 + Math.random() * 900000);
  }
}

export const OTPService = new Service();
