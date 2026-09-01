import { Router } from "express";
import { OTPController } from "./otp.controller";

const router = Router();

router.post("/resend", OTPController.resendOtp);

router.post("/verify", OTPController.verifyOtp);

router.post("/verify/forget-password", OTPController.verifyForgetPasswordOTP);

export const OTPRoutes = router;
