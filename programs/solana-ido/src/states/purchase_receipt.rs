use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PurchaseReceipt {
    pub buyer: Pubkey,
    pub pool: Pubkey,
    pub currency_amount: u64,
    pub tokens_received: u64,
    pub timestamp: i64,
    pub is_claimed: bool,
}

impl PurchaseReceipt {
    pub const LEN: usize = 8 + PurchaseReceipt::INIT_SPACE;
}
