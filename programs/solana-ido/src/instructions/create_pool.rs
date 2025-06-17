use anchor_lang::prelude::*;

use crate::{ pool::Pool, CREATE_POOL, ErrorMessage };

#[derive(Accounts)]
#[instruction(pool_id: String)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = Pool::LEN,
        seeds = [CREATE_POOL, creator.key().as_ref(), pool_id.as_bytes().as_ref()],
        bump
    )]
    pub pool_config: Account<'info, Pool>,
    // System program
    pub system_program: Program<'info, System>,
}

pub fn _create_pool(
    ctx: Context<CreatePool>,
    pool_id: String,
    pool_name: String,
    start_time: i64,
    end_time: i64,
    total_tokens_available: u64,
    price: u64,
    token_address: Pubkey,
    max_per_user: u64
) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;

    if start_time < current_time {
        return Err(ErrorMessage::StartTimeInThePast.into());
    }

    if end_time <= start_time {
        return Err(ErrorMessage::EndTimeMustBeGreaterThanStart.into());
    }

    let pool_config = &mut ctx.accounts.pool_config;
    pool_config.pool_id = pool_id;
    pool_config.pool_name = pool_name;
    pool_config.creator = ctx.accounts.creator.key();
    pool_config.start_time = start_time;
    pool_config.end_time = end_time;
    pool_config.total_tokens_available = total_tokens_available;
    pool_config.price = price;
    pool_config.token_address = token_address;
    pool_config.max_per_user = max_per_user;

    Ok(())
}
