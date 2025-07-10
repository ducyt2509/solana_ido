use crate::{
    pool_account::PoolAccount,
    user_account::UserAccount,
    ErrorMessage,
    POOL_SEED,
    USER_ACCOUNT_SEED,
    buy_token::calculate_buy_token,
};

use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::clock;
use anchor_spl::token_interface::{ self, TransferChecked };
use anchor_spl::{ associated_token::AssociatedToken, token::{ Mint, Token, TokenAccount } };

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = pool_account.signer == pool_signer.key() @ ErrorMessage::InvalidPoolSigner,
    )]
    pub pool_signer: Signer<'info>,

    // Currency
    #[account(mut)]
    pub input_mint: Account<'info, Mint>,

    // Token to be bought
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    /// CHECK:
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, token_mint.key().as_ref()],
        bump,
        has_one = receiver
    )]
    pub pool_account: Account<'info, PoolAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = UserAccount::LEN,
        seeds = [USER_ACCOUNT_SEED, pool_account.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyer_account: Account<'info, UserAccount>,

    #[account(
        mut,
        associated_token::mint = input_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = input_mint,
        associated_token::authority = receiver,
        associated_token::token_program = token_program,
    )]
    pub receiver_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<(Pubkey, Pubkey, u64)> {
    // Logic check
    let current_time: u64 = clock::Clock::get()?.unix_timestamp.try_into().unwrap();
    let pool_account: &mut Account<'_, PoolAccount> = &mut ctx.accounts.pool_account;
    let buyer_account = &mut ctx.accounts.buyer_account;
    let bought_token = calculate_buy_token(
        amount.try_into().unwrap(),
        pool_account.token_rate.try_into().unwrap(),
        pool_account.token_rate_decimals.try_into().unwrap()
    ).unwrap();

    require!(pool_account.start_time <= current_time, ErrorMessage::SaleNotStartedYet);
    require!(current_time <= pool_account.end_time, ErrorMessage::SaleEnded);
    require!(
        bought_token <= pool_account.token_for_sale.checked_sub(pool_account.token_sold).unwrap(),
        ErrorMessage::NotEnoughTokenToBuy
    );

    let decimals = ctx.accounts.input_mint.decimals;
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        mint: ctx.accounts.input_mint.to_account_info(),
        to: ctx.accounts.receiver_token_account.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    pool_account.token_sold = pool_account.token_sold.checked_add(bought_token).unwrap();
    buyer_account.bought = buyer_account.bought.checked_add(bought_token).unwrap();

    Ok((ctx.accounts.buyer.key(), ctx.accounts.buyer.key(), amount))
}
