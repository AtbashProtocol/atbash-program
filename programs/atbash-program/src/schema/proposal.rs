use crate::constant::*;
use anchor_lang::prelude::*;

#[account]
pub struct Proposal {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub candidates: Vec<Pubkey>,
    pub ballot_boxes: Vec<u64>,
    pub start_date: i64,
    pub end_date: i64,
    pub metadata: [u8; 32],
}

impl Proposal {
    pub const LEN: usize = DISCRIMINATOR_SIZE
        + PUBKEY_SIZE * 2
        + MAXIMUM_MINT_NUMBER * PUBKEY_SIZE
        + MAXIMUM_MINT_NUMBER * U64_SIZE
        + I64_SIZE
        + I64_SIZE
        + U8_SIZE * 32;
}
