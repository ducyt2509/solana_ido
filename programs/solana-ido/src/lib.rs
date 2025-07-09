use anchor_lang::prelude::*;
pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod states;
pub mod utils;

pub use constants::*;
pub use errors::*;
pub use events::*;
pub use instructions::{ buy_token::*, create_pool::*, initialize::*, claim_token::* };

pub use states::*;
pub use utils::*;

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
        token_for_sale: u64,
        token_sold: u64,
        token_rate: u64,
        token_rate_decimals: u8,
        currency: Pubkey,
        token: Pubkey,
        signer: Pubkey,
        receiver: Pubkey
    ) -> Result<()> {
        let (signer, accept_currency, mint_token) = process_create_pool(
            ctx,
            start_time,
            end_time,
            claim_time,
            token_for_sale,
            token_sold,
            token_rate,
            token_rate_decimals,
            currency,
            token,
            signer,
            receiver
        )?;
        emit!(PoolCreatedEvent {
            signer,
            accept_currency,
            mint: mint_token,
        });
        Ok(())
    }

    pub fn buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<()> {
        let (buyer, token, amount) = process_buy_token(ctx, amount)?;
        emit!(BuyTokenEvent {
            buyer,
            token,
            amount,
        });
        Ok(())
    }

    pub fn claim_token(ctx: Context<ClaimToken>) -> Result<()> {
        let (buyer, token, amount) = process_claim_token(ctx)?;
        emit!(BuyTokenEvent {
            buyer,
            token,
            amount,
        });
        Ok(())
    }
}
