use crate::constant::*;
use anchor_lang::{prelude::*, solana_program::keccak};

#[account]
pub struct Receipt {
    pub authority: Pubkey,
    pub proposal: Pubkey,
    pub locked_date: i64,
    pub salt: [u8; 32],
}
impl Receipt {
    pub const LEN: usize = DISCRIMINATOR_SIZE + PUBKEY_SIZE * 2 + I64_SIZE + U8_SIZE * 32;

    pub fn hash(&self) -> [u8; 32] {
        keccak::hashv(&[&self.authority.to_bytes(), &self.salt]).0
    }
}
