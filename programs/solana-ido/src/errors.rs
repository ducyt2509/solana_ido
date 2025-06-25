use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorMessage {
    // ============================== Validate Time Input ==============================
    #[msg("Start time cannot be in the past.")]
    StartTimeInThePast,

    #[msg("End time cannot be in the past.")]
    EndTimeInThePast,

    #[msg("End time must be after start time.")]
    EndTimeBeforeStartTime,

    #[msg("Claim time cannot be in the past.")]
    ClaimTimeInThePast,

    #[msg("Claim time must be after end time.")]
    ClaimTimeBeforeEndTime,

    // ============================== Validate Pool Input ==============================
    #[msg("Pool is not started yet.")]
    PoolNotStarted,

    #[msg("Pool is already ended.")]
    PoolAlreadyEnded,

    #[msg("Pool is not ready for claim.")]
    PoolNotReadyForClaim,

    #[msg("Invalid Token Account for specified currency.")]
    InvalidCurrencyAccount,

    #[msg("Insufficient balance to complete the purchase.")]
    InsufficientBalance,

    #[msg("Math overflow occurred.")]
    MathOverflow,

    #[msg("Invalid amount to pay.")]
    InvalidAmount,

    // ============================== Validate Auth ==============================
    #[msg("Unauthorized")]
    Unauthorized,
}
