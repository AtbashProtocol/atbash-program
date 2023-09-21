use crate::constant::*;
use anchor_lang::{prelude::*, solana_program::keccak};

#[account]
pub struct Proposal {
    pub authority: Pubkey,
    pub candidates: Vec<Pubkey>,
    pub ballot_boxes: Vec<[u8; 32]>,
    pub random_numbers: Vec<u64>,
    pub start_date: i64,
    pub end_date: i64,
    pub metadata: [u8; 32],
    pub merkle_root: [u8; 32],
}

impl Proposal {
    pub const LEN: usize = DISCRIMINATOR_SIZE
        + PUBKEY_SIZE
        + MAXIMUM_MINT_NUMBER * PUBKEY_SIZE
        + MAXIMUM_MINT_NUMBER * U8_SIZE * 32
        + MAXIMUM_MINT_NUMBER * U64_SIZE
        + I64_SIZE
        + I64_SIZE
        + U8_SIZE * 32
        + U8_SIZE * 32;

    pub fn is_started(&self, current_time: i64) -> bool {
        if self.start_date == 0 {
            return true;
        }
        return self.start_date <= current_time;
    }

    pub fn is_ended(&self, current_time: i64) -> bool {
        if self.end_date == 0 {
            return false;
        }
        return self.end_date <= current_time;
    }

    pub fn verify(&self, proof: Vec<[u8; 32]>, leaf: [u8; 32]) -> bool {
        let mut child = leaf;
        for sibling in proof.into_iter() {
            child = if child <= sibling {
                keccak::hashv(&[&child, &sibling]).0
            } else {
                keccak::hashv(&[&sibling, &child]).0
            }
        }
        child == self.merkle_root
    }
}
