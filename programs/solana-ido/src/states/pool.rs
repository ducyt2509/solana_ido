use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolAccount {
    pub start_time: u64,
    pub end_time: u64,
    pub claim_time: u64,
    pub tokens_for_sale: u64,
    pub token_decimals: u8,
    pub token_rate: u64,
    pub decimals: u8,
    pub currency: Pubkey,
    pub token: Pubkey,
    pub signer: Pubkey,
}

impl PoolAccount {
    pub const LEN: usize = 8 + PoolAccount::INIT_SPACE;
}
