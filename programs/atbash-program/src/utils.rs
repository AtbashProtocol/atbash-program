use anchor_lang::prelude::*;
use solana_zk_token_sdk::curve25519::scalar::PodScalar;

pub fn current_timestamp() -> Option<i64> {
    let clock = Clock::get().ok()?;
    Some(clock.unix_timestamp)
}

pub fn u64_to_pod_scalar(num: u64) -> Option<PodScalar> {
    let scalar_bytes = num.to_le_bytes();
    let mut scalar_value: [u8; 32] = [0; 32];
    scalar_value[..scalar_bytes.len()].copy_from_slice(&scalar_bytes);
    let s: PodScalar = PodScalar(scalar_value);
    Some(s)
}
