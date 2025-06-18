use anchor_lang::prelude::*;

pub mod instructions;
pub mod states;
pub mod constants;
pub mod errors;

pub use instructions::{ initialize::*, create_pool::* };
pub use states::*;
pub use constants::*;
pub use errors::*;

declare_id!("CkuW9DsH4FhZwbeHV8mx26nosemXZDHYz92QJ5Nb5frM");

#[program]
pub mod solana_ido {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, owner: Pubkey, creator: Pubkey) -> Result<()> {
        process_initialize(ctx, owner, creator)
    }

    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: String,
        pool_name: String,
        start_time: u64,
        end_time: u64,
        total_tokens_available: u64,
        price: u64,
        token_address: Pubkey,
        max_per_user: u64
    ) -> Result<()> {
        _create_pool(
            ctx,
            pool_id,
            pool_name,
            start_time,
            end_time,
            total_tokens_available,
            price,
            token_address,
            max_per_user
        )
    }
}
