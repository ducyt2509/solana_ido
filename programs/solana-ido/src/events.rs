use anchor_lang::prelude::*;

#[event]
pub struct PoolCreatedEvent {
    pub signer: Pubkey,
    pub accept_currency: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct BuyTokenEvent {
    pub buyer: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ClaimTokenEvent {
    pub buyer: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}
