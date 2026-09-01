interface TCoupon {
    _id?: string;
    code: string;
    discount_type: "percentage" | "fixedAmount" | "freeShipping";
    discount_value: number;
    max_discount_amount?: number;
    start_date: Date;
    end_date: Date;
    usage_limit: number;
    usage_count: number;
    minimum_order_amount: number;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

interface TCouponValidation {
    is_valid: boolean;
    discount_amount?: number;
    message?: string;
}

export { TCoupon, TCouponValidation };
