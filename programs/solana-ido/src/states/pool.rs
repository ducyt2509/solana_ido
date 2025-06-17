use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Pool {
    #[max_len(36)]
    pub pool_id: String,
    #[max_len(36)]
    pub pool_name: String,
    pub creator: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub total_tokens_available: u64,
    pub price: u64,
    pub token_address: Pubkey,
    pub max_per_user: u64,
}

impl Pool {
    pub const LEN: usize = 8 + Pool::INIT_SPACE;
}
