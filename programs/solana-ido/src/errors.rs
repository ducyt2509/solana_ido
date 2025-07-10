use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorMessage {
    // ============================AUTHORIZE===========================
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("InvalidSigner")]
    InvalidPoolSigner,

    // ============================POOL===========================
    #[msg("InvalidPoolTime")]
    InvalidPoolTime,

    #[msg("InsufficientBalance")]
    InsufficientBalance,

    #[msg("SaleNotStartedYet")]
    SaleNotStartedYet,

    #[msg("SaleEnded")]
    SaleEnded,

    #[msg("BuyMoreThanAllowed")]
    BuyMoreThanAllowed,

    #[msg("NotEnoughTokenToBuy")]
    NotEnoughTokenToBuy,

    #[msg("ClaimNotStartedYet")]
    ClaimNotStartedYet,

    #[msg("UserHasNotBoughtTokens")]
    UserHasNotBoughtTokens,

    #[msg("AlreadyClaimed")]
    AlreadyClaimed,
}
