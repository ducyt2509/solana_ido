use crate::{
    pool_account::PoolAccount,
    user_account::UserAccount,
    ErrorMessage,
    POOL_SEED,
    USER_ACCOUNT_SEED,
};

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{ program::invoke_signed, sysvar::clock };
use anchor_spl::{
    token::{ self, Mint, Token, TokenAccount, TransferChecked },
    associated_token::AssociatedToken,
};

#[derive(Accounts)]
pub struct ClaimToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = pool_account,
        associated_token::token_program = token_program
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_claim_token(ctx: Context<ClaimToken>) -> Result<(Pubkey, Pubkey, u64)> {
    let buyer = &ctx.accounts.buyer;
    let buyer_account = &mut ctx.accounts.buyer_account;
    let pool_account = &ctx.accounts.pool_account;

    let current_time = clock::Clock::get()?.unix_timestamp as u64;
    require!(current_time >= pool_account.claim_time, ErrorMessage::ClaimNotStartedYet);

    let amount_to_claim = buyer_account.bought;
    require!(amount_to_claim > 0, ErrorMessage::AlreadyClaimed);

    let token_mint_key = ctx.accounts.token_mint.key();
    let pool_signer_seeds: [&[u8]; 3] = [
        POOL_SEED,
        token_mint_key.as_ref(),
        &[ctx.bumps.pool_account],
    ];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.pool_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.buyer_token_account.to_account_info(),
        authority: ctx.accounts.pool_account.to_account_info(),
    };

    token::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &[&pool_signer_seeds]
        ),
        amount_to_claim,
        ctx.accounts.token_mint.decimals
    )?;

    Ok((buyer.key(), token_mint_key, amount_to_claim))
}
