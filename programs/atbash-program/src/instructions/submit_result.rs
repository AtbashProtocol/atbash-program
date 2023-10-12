use crate::schema::proposal::*;
use crate::{constant::*, u64_to_pod_scalar};
use anchor_lang::prelude::*;
use solana_zk_token_sdk::curve25519::edwards::*;

use crate::errors::ErrorCode;

#[event]
pub struct SubmitResultEvent {
    pub proposal: Pubkey,
    pub result: Vec<u64>,
}

#[derive(Accounts)]
pub struct SubmitResult<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    // programs
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn submit(ctx: Context<SubmitResult>, result: Vec<u64>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let authority = ctx.accounts.authority.key();

    if !authority.eq(&proposal.authority) {
        return err!(ErrorCode::InvalidAuthority);
    }

    let base = PodEdwardsPoint(BASE);
    let p = PodEdwardsPoint(PUB_KEY);

    let ballot_boxes = proposal.ballot_boxes.clone();
    let random_numbers = proposal.random_numbers.clone();

    if ballot_boxes.len() != result.len() {
        return err!(ErrorCode::InvalidResultLength);
    }

    for i in 0..result.len() {
        let result_point = PodEdwardsPoint(ballot_boxes[i]);

        let scalar = u64_to_pod_scalar(result[i]).ok_or(ErrorCode::InvalidResultValue)?;
        let total_base = multiply_edwards(&scalar, &base).ok_or(ErrorCode::InvalidPoint)?;

        let r = u64_to_pod_scalar(random_numbers[i]).ok_or(ErrorCode::InvalidResultValue)?;
        let r_p = multiply_edwards(&r, &p).ok_or(ErrorCode::InvalidPoint)?;

        let sum = add_edwards(&total_base, &r_p).ok_or(ErrorCode::InvalidPoint)?;
        if !result_point.eq(&sum) {
            return err!(ErrorCode::InvalidResultValue);
        }
    }

    proposal.result = result;

    emit!(SubmitResultEvent {
        proposal: proposal.key(),
        result: proposal.result.clone(),
    });
    Ok(())
}
