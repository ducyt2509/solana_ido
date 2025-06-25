use anchor_lang::prelude::*;

#[event]
pub struct BuyTokenEvent {
    pub buyer: Pubkey,
    pub pool: Pubkey,
    pub currency_amount: u64,
    pub tokens_received: u64,
    pub timestamp: i64,
}
