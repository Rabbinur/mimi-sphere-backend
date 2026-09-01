// modules/ekpay/ekpay.interface.ts
export interface EkPayInitiatePaymentRequest {
    // mer_info: {
    //     mer_reg_id: string;
    //     mer_pas_key: string;
    // };
    // req_timestamp: string;
    feed_uri: {
        s_uri: string;
        f_uri: string;
        c_uri: string;
    };
    cust_info: {
        cust_id?: string;
        cust_name: string;
        cust_mobo_no: string;
        cust_email: string;
        cust_mail_addr?: string;
    };
    trns_info: {
        trnx_id: string;
        trnx_amt: string;
        trnx_currency: string;
        ord_id?: string;
        ord_det?: string;
    };
    ipn_info: {
        ipn_channel: string;
        ipn_email?: string;
        ipn_uri?: string;
    };
    mac_addr: string;
}

export interface EkPayInitiatePaymentResponse {
    secure_token: string | null;
    token_exp_time: string | null;
    msg_code: string;
    msg_det: string;
    ack_timestamp: string;
}