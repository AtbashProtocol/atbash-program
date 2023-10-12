use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,
    #[msg("Invalid votes")]
    InvalidVotes,
    #[msg("Invalid Point")]
    InvalidPoint,
    #[msg("Cannot get current date")]
    InvalidCurrentDate,
    #[msg("Start date need to be greater than or equal to current date")]
    InvalidStartDate,
    #[msg("The community isn't consenting on the proposal yet")]
    NotConsentedProposal,
    #[msg("The proposal isn't started yet")]
    NotStartedProposal,
    #[msg("The proposal isn't ended yet")]
    NotEndedProposal,
    #[msg("The proposal is started")]
    StartedProposal,
    #[msg("The proposal had been ended")]
    EndedProposal,
    #[msg("Invalid result length!")]
    InvalidResultLength,
    #[msg("Invalid result value!")]
    InvalidResultValue,
    #[msg("Invalid authority!")]
    InvalidAuthority,
}
