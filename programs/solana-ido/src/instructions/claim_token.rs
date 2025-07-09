use crate::{
    pool_account::PoolAccount,
    user_account::UserAccount,
    ErrorMessage,
    POOL_SEED,
    USER_ACCOUNT_SEED,
};

use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::clock;
use anchor_spl::token_interface::{ self, TransferChecked };
use anchor_spl::{ token::{ Mint, Token, TokenAccount } };

#[derive(Accounts)]
pub struct ClaimToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub pool_signer: Signer<'info>,

    // Currency
    #[account(mut)]
    pub input_mint: Account<'info, Mint>,

    // Token to be bought
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [POOL_SEED, token_mint.key().as_ref()],
        bump,
    )]
    pub pool_account: Account<'info, PoolAccount>,

    #[account(seeds = [USER_ACCOUNT_SEED, pool_account.key().as_ref(), buyer.key().as_ref()], bump)]
    pub buyer_account: Account<'info, UserAccount>,

    #[account(
        mut,
        associated_token::mint = input_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn process_claim_token(ctx: Context<ClaimToken>) -> Result<(Pubkey, Pubkey, u64)> {
    // Logic check
    let current_time: u64 = clock::Clock::get()?.unix_timestamp.try_into().unwrap();
    let pool_account: &mut Account<'_, PoolAccount> = &mut ctx.accounts.pool_account;
    let buyer_account = &mut ctx.accounts.buyer_account;
    let token_mint: &Account<'_, Mint> = &ctx.accounts.token_mint;
    let amount: u64 = buyer_account.bought;

    require!(pool_account.claim_time <= current_time, ErrorMessage::ClaimNotStartedYet);
    require!(amount > 0, ErrorMessage::UserHasNotBoughtTokens);

    require!(buyer_account.claimed == 0, ErrorMessage::AlreadyClaimed);

    // Transfer tokens from pool to buyer
    let decimals = ctx.accounts.token_mint.decimals;
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.pool_account.to_account_info(),
        mint: token_mint.to_account_info(),
        to: ctx.accounts.buyer.to_account_info(),
        authority: ctx.accounts.pool_signer.to_account_info(),
    };
    let cpi_program = ctx.accounts.pool_account.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token_interface::transfer_checked(cpi_ctx, amount, decimals)?;

    Ok((ctx.accounts.buyer.key(), ctx.accounts.token_mint.key(), amount))
}
