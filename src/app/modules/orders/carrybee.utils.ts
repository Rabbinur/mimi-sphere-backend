import axios from 'axios';

const BASE_URL = 'https://developers.carrybee.com';
const CLIENT_ID = 'd609326e-14b4-4ab2-abb3-ee15ab8c993a';
const CLIENT_SECRET = '31f72248-3b7c-4a7b-815c-da4c569e69c7';
const CLIENT_CONTEXT = 'sVJo8jaGonyxSfHYik9EJchM31egWX';

export interface TCarrybeeOrder {
  store_id: string;
  merchant_order_id?: string;
  delivery_type: number; // 1: Normal, 2: Express
  product_type: number; // 1: Parcel, 2: Book, 3: Document
  recipient_phone: string;
  recipient_name: string;
  recipient_address: string;
  city_id: number;
  zone_id: number;
  area_id?: number;
  item_weight: number; // in Grams
  item_quantity: number;
  collectable_amount: number;
  is_closed?: boolean;
}

export class CarrybeeUtils {
  private static headers = {
    'Client-ID': CLIENT_ID,
    'Client-Secret': CLIENT_SECRET,
    'Client-Context': CLIENT_CONTEXT,
    'Content-Type': 'application/json',
  };

  static async getStores() {
    try {
      const response = await axios.get(`${BASE_URL}/api/v2/stores`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(
        'Carrybee Get Stores Error:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  static async getAddressDetails(query: string) {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/v2/address-details`,
        { query },
        {
          headers: this.headers,
        },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Carrybee Address Details Error:',
        error?.response?.data || error.message,
      );
      return null;
    }
  }

  static async createOrder(data: TCarrybeeOrder) {
    try {
      const response = await axios.post(`${BASE_URL}/api/v2/orders`, data, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(
        'Carrybee Create Order Error:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  static async getOrderDetails(consignmentId: string) {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v2/orders/${consignmentId}/details`,
        {
          headers: this.headers,
        },
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Carrybee Get Order Details Error:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }
}
