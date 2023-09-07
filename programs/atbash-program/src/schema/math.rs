use crate::constant::*;
use anchor_lang::prelude::*;

#[account]
pub struct Math {
    pub add_point: [u8; 32],
    pub mul_point: [u8; 32],
}

impl Math {
    pub const LEN: usize = DISCRIMINATOR_SIZE + U8_SIZE * 32 + U8_SIZE * 32;
}
