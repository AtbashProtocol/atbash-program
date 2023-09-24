use crate::constant::*;

use anchor_lang::{prelude::*, solana_program::keccak};
use solana_zk_token_sdk::curve25519::edwards::*;
use solana_zk_token_sdk::curve25519::scalar::PodScalar;

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

    pub fn get_valid_sum(&self, random_numbers: Vec<u64>) -> Option<[u8; 32]> {
        let valid_sum = &mut PodEdwardsPoint(BASE);
        let pubkey = PodEdwardsPoint(PUB_KEY);

        for idx in 0..random_numbers.len() {
            let scalar_bytes = random_numbers[idx].to_le_bytes();
            let mut scalar_value: [u8; 32] = [0; 32];
            scalar_value[..scalar_bytes.len()].copy_from_slice(&scalar_bytes);
            let s: PodScalar = PodScalar(scalar_value);

            let mul_point = multiply_edwards(&s, &pubkey)?;
            *valid_sum = add_edwards(&valid_sum, &mul_point)?;
        }
        Some(valid_sum.0)
    }
}
