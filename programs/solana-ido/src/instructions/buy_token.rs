use std::ops::{ Div, Mul };

use anchor_lang::prelude::*;

use crate::{
    pool::PoolAccount,
    purchase_receipt::PurchaseReceipt,
    ErrorMessage,
    BUY_TOKEN_SEED,
    POOL_SEED,
    buy_token_event::BuyTokenEvent,
};
use anchor_spl::token::{ self, Mint, Token, TokenAccount, Transfer };

#[derive(Accounts)]
#[instruction(amount_to_pay: u64, token : Pubkey, )]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(seeds = [POOL_SEED, token.key().as_ref()], bump)]
    pub pool_account: Account<'info, PoolAccount>,

    #[account(
        mut,
        constraint = associated_token.mint == pool_account.currency @ ErrorMessage::InvalidCurrencyAccount,
        constraint = associated_token.amount >= amount_to_pay @ ErrorMessage::InsufficientBalance
    )]
    pub associated_token: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = buyer,
        space = PurchaseReceipt::LEN,
        seeds = [BUY_TOKEN_SEED, buyer.key().as_ref(), pool_account.key().as_ref()],
        bump
    )]
    pub purchase_receipt: Account<'info, PurchaseReceipt>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn _buy_token(ctx: Context<BuyToken>, amount_to_pay: u64, token: Pubkey) -> Result<()> {
    require!(amount_to_pay > 0, ErrorMessage::InvalidAmount);

    let pool = &ctx.accounts.pool_account;
    let receipt = &mut ctx.accounts.purchase_receipt;

    let now = Clock::get()?.unix_timestamp;

    let tokens_received = 1000;

    msg!(
        "Calculating tokens received: {} = ({} * {} * {}) / {}",
        tokens_received,
        amount_to_pay,
        pool.decimals,
        pool.token_rate,
        pool.token_decimals
    );

    receipt.buyer = ctx.accounts.buyer.key();
    receipt.pool = pool.key();
    receipt.currency_amount = amount_to_pay;
    receipt.tokens_received = tokens_received as u64;
    receipt.timestamp = now;
    receipt.is_claimed = false;

    // emit!(BuyTokenEvent {
    //     buyer: ctx.accounts.buyer.key(),
    //     pool: pool.key(),
    //     currency_amount: amount_to_pay,
    //     tokens_received as u64,
    //     timestamp: now,
    // });

    msg!(
        "User {} bought {} tokens for {} currency at pool {}",
        ctx.accounts.buyer.key(),
        tokens_received,
        amount_to_pay,
        pool.key()
    );
    Ok(())
}
