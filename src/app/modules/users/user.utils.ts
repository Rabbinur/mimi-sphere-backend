import bcrypt from 'bcrypt';
import config from '../../config';

class UtilService {
  async hash(payload: string) {
    return await bcrypt.hash(payload, Number(config.bcrypt_salt_rounds));
  }

  async compare(payload: string, hashed: string) {
    return await bcrypt.compare(payload, hashed);
  }
}

export const Utils = new UtilService();
