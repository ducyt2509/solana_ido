pub use anchor_lang::prelude::*;

pub fn calculate_buy_token(amount: u128, token_rate: u128) -> Result<u64> {
    let amount_out = amount.checked_mul(token_rate).unwrap();
    Ok(amount_out.try_into().unwrap())
}
