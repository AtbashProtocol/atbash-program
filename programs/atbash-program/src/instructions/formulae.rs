use anchor_lang::prelude::*;
use solana_zk_token_sdk::curve25519::edwards::*;
use solana_zk_token_sdk::curve25519::scalar::PodScalar;

use crate::errors::ErrorCode;
use crate::schema::math::*;

#[derive(Accounts)]
pub struct InitMath<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = Math::LEN)]
    pub math: Account<'info, Math>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn exec_math_formulae(ctx: Context<InitMath>, point: [u8; 32]) -> Result<()> {
    let math = &mut ctx.accounts.math;

    let ed_point: PodEdwardsPoint = PodEdwardsPoint(point);

    let integer_value: u64 = 123344; // Replace with your desired integer value
    let scalar_bytes = integer_value.to_le_bytes();
    let mut scalar_value: [u8; 32] = [0; 32];
    scalar_value[..scalar_bytes.len()].copy_from_slice(&scalar_bytes);
    let s: PodScalar = PodScalar(scalar_value);

    let add_point = add_edwards(&ed_point, &ed_point).ok_or(ErrorCode::InvalidCurrentDate)?;
    let mul_point = multiply_edwards(&s, &ed_point).ok_or(ErrorCode::InvalidCurrentDate)?;

    math.add_point = add_point.0;
    math.mul_point = mul_point.0;
    Ok(())
}
