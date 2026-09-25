import { Router } from "express";
import { OTPController } from "./otp.controller";
import { otpLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post("/resend", otpLimiter, OTPController.resendOtp);

router.post("/verify", otpLimiter, OTPController.verifyOtp);

router.post("/verify/forget-password", otpLimiter, OTPController.verifyForgetPasswordOTP);

export const OTPRoutes = router;
