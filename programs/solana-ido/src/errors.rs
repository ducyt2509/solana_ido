use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorMessage {
    #[msg("Start time cannot be in the past.")]
    StartTimeInThePast,

    #[msg("End time must be greater than start time.")]
    EndTimeMustBeGreaterThanStart,
}
