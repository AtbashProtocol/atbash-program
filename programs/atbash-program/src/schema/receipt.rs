use crate::constant::*;
use anchor_lang::prelude::*;

#[account]
pub struct Receipt {
    pub authority: Pubkey,
    pub proposal: Pubkey,
    pub locked_date: i64,
}
impl Receipt {
    pub const LEN: usize = DISCRIMINATOR_SIZE + PUBKEY_SIZE * 2 + I64_SIZE;
}
