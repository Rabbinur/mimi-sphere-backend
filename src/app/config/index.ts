import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS || '10',
  jwt_access_secret: process.env.JWT_ACCESS_SECRET || 'mySuperSecretKey12345',
  jwt_refresh_secret:
    process.env.JWT_REFRESH_SECRET || 'mySuperRefreshSecretKey12345',
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  merRegId: process.env.EKPAY_MER_REG_ID || '',
  merPasKey: process.env.EKPAY_MER_PAS_KEY || '',
  cj_api_key: process.env.CJ_API_KEY || '',
  aws: {
    access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    bucket: process.env.AWS_BUCKET || '',
    use_path_style_endpoint: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true',
    file_load_base:
      process.env.AWS_FILE_LOAD_BASE ||
      'https://softwebsys.s3.us-east-1.amazonaws.com',
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || '587',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    secure: process.env.SMTP_PORT === '465' ? true : false,
  },
  bkash: {
    app_key: process.env.BKASH_APP_KEY || '',
    app_secret: process.env.BKASH_APP_SECRET || '',
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
    base_url: process.env.BKASH_BASE_URL || '',
  },
  frontend_url:
    process.env.NODE_ENV === 'production'
      ? 'https://shoppingcart.bd'
      : 'http://localhost:3000',
  meta: {
    token: process.env.META_TOKEN || '',
    pixelId: process.env.META_PIXEL_ID || '',
    apiVersion: process.env.META_API_VERSION || 'v19.0',
    testEventCode: process.env.META_TEST_EVENT_CODE || '',
  },
  google_merchant_id: process.env.GOOGLE_MERCHANT_ID || '',
};
