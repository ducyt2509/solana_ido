use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub bought: u64,
    pub claimed: u64,
    pub pool: Pubkey,
}

impl UserAccount {
    pub const LEN: usize = 8 + UserAccount::INIT_SPACE;
}
