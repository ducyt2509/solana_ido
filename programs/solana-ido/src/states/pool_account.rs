use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolAccount {
    pub start_time: u64,
    pub end_time: u64,
    pub claim_time: u64,
    pub token_for_sale: u64, // total sales
    pub token_sold: u64, // currently sold
    pub token_rate: u64, // conversion rate
    pub token_rate_decimals: u8, // conversion rate
    pub currency: Pubkey, // usdt
    pub token: Pubkey, // SPL token
    pub signer: Pubkey, // control allocation
    pub receiver: Pubkey, // wallet will be received usdt
}

impl PoolAccount {
    pub const LEN: usize = 8 + PoolAccount::INIT_SPACE;
}
