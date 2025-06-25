use anchor_lang::prelude::*;

pub mod instructions;
pub mod states;
pub mod constants;
pub mod errors;
pub mod events;

pub use instructions::{ initialize::*, create_pool::*, buy_token::* };
pub use states::*;
pub use constants::*;
pub use errors::*;
pub use events::*;

declare_id!("CkuW9DsH4FhZwbeHV8mx26nosemXZDHYz92QJ5Nb5frM");
#[program]
pub mod solana_ido {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, owner: Pubkey, creator: Pubkey) -> Result<()> {
        process_initialize(ctx, owner, creator)
    }

    pub fn create_pool(
        ctx: Context<CreatePool>,
        start_time: u64,
        end_time: u64,
        claim_time: u64,
        tokens_for_sale: u64,
        token_decimals: u8,
        token_rate: u64,
        decimals: u8,
        currency: Pubkey,
        token: Pubkey,
        signer: Pubkey
    ) -> Result<()> {
        process_create_pool(
            ctx,
            start_time,
            end_time,
            claim_time,
            tokens_for_sale,
            token_decimals,
            token_rate,
            decimals,
            currency,
            token,
            signer
        )
    }

    pub fn buy_token(ctx: Context<BuyToken>, amount_to_pay: u64, token: Pubkey) -> Result<()> {
        _buy_token(ctx, amount_to_pay, token)
    }
}
