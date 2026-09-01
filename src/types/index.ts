export interface TIpnData {
  secure_token: string;
  msg_code: string;
  msg_det: string;
  req_timestamp: string;
  basic_Info: {
    mer_reg_id: string;
    ipn_info: string;
    redirect_to: string;
    dgtl_sign: string;
    ord_desc: string;
    remarks: string;
  };
  cust_info: {
    cust_id: string | null;
    cust_name: string;
    cust_mobo_no: string;
    cust_email: string;
    cust_mail_addr: string | null;
  };
  scroll_no: string | null;
  trnx_info: {
    trnx_amt: string;
    trnx_id: string;
    mer_trnx_id: string;
    curr: string;
    pi_trnx_id: string;
    pi_charge: string;
    ekpay_charge: string;
    pi_discount: string;
    discount: string;
    promo_discount: string;
    total_ser_chrg: string;
    total_pabl_amt: string;
  };
  pi_det_info: {
    pay_timestamp: string;
    pi_name: string;
    pi_type: string;
    pi_number: string;
    pi_gateway: string;
    card_holder_name: string;
  };
}