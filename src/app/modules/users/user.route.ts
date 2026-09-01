import express from 'express';
import { UserController } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidationSchema } from './user.validate';
import verifyToken from '../../middlewares/verifyToken';
import { UserRole } from './user.constant';
const router = express.Router();

// User routes
router.post(
  '/create-account',
  validateRequest(UserValidationSchema.createZodSchema),
  UserController.registerUser,
);
router.post('/login', UserController.loginUser);
router.post('/google-login', UserController.googleLogin);

router.post('/refresh-token', UserController.refreshToken);

router.post('/forget-password', UserController.forgetPassword);

router.post('/reset-password', UserController.resetPassword);

router.post('/logout', UserController.logout);

router.patch('/profile', verifyToken(), UserController.updateMyProfile);
router.patch('/change-password', verifyToken(), UserController.changeMyPassword);

router.get('/', verifyToken(), UserController.getUserByToken);

router.get('/auth-check', verifyToken(), UserController.authCheck);

router.get('/db/overview', verifyToken([UserRole.ADMIN]), UserController.dbOverview);

// Admin route
router.get('/all', verifyToken([UserRole.ADMIN]), UserController.getAllUser);

router.get(
  '/:id',
  verifyToken([UserRole.USER, UserRole.ADMIN]),
  UserController.getUserById,
);

router.patch(
  '/:id',
  verifyToken([UserRole.USER, UserRole.ADMIN]),
  UserController.updateUser,
);

router.patch(
  '/:id/password',
  verifyToken([UserRole.USER]),
  UserController.changePasswordByUserId,
);

router.delete('/:id', verifyToken([UserRole.ADMIN]), UserController.deleteUser);

export const UserRoutes = router;
