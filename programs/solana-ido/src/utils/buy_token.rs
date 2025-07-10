pub use anchor_lang::prelude::*;

pub fn calculate_buy_token(amount: u128, token_rate: u128, token_rate_decimals: u8) -> Result<u64> {
    let amount_out = amount
        .checked_mul(token_rate)
        .unwrap()
        .checked_div((10u128).pow(token_rate_decimals as u32))
        .unwrap();
    Ok(amount_out.try_into().unwrap())
}
