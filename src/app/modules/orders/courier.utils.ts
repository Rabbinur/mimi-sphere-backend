import axios from 'axios';

const BASE_URL = 'https://portal.packzy.com/api/v1';
const API_KEY = 'yrgdw95cb9fw960wfc4fo7mnqgwo6ybq';
const SECRET_KEY = 'a431zgwghgagkibvl49gictl';

export interface TSteadfastOrder {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

export class CourierUtils {
  private static headers = {
    'Api-Key': API_KEY,
    'Secret-Key': SECRET_KEY,
    'Content-Type': 'application/json',
  };

  static async createOrder(data: TSteadfastOrder) {
    try {
      const response = await axios.post(`${BASE_URL}/create_order`, data, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(
        'Steadfast Create Order Error:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  static async getOrderStatus(trackingCode: string) {
    try {
      const response = await axios.get(
        `${BASE_URL}/status_by_trackingcode/${trackingCode}`,
        {
          headers: this.headers,
        },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Steadfast Get Status Error:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  static async getBalance() {
    try {
      const response = await axios.get(`${BASE_URL}/get_balance`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(
        'Steadfast Get Balance Error:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }
}
