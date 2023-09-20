use anchor_lang::prelude::*;
use solana_zk_token_sdk::curve25519::edwards::*;

use crate::errors::ErrorCode;
use crate::schema::proposal::*;
use crate::schema::receipt::*;
use crate::utils::current_timestamp;

#[event]
pub struct VoteEvent {
    pub proposal: Pubkey,
    pub authority: Pubkey,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = Receipt::LEN)]
    pub receipt: Account<'info, Receipt>,

    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    // programs
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn exec(ctx: Context<Vote>, votes: Vec<[u8; 32]>, random_numbers: Vec<u64>) -> Result<()> {
    let receipt = &mut ctx.accounts.receipt;
    // Validate time

    // Print receipt
    let locked_date = current_timestamp();
    receipt.authority = ctx.accounts.authority.key();
    receipt.proposal = ctx.accounts.proposal.key();
    receipt.locked_date = locked_date.ok_or(ErrorCode::InvalidCurrentDate)?;

    let proposal = &mut ctx.accounts.proposal;
    // Update random numbers
    for idx in 0..proposal.random_numbers.len() {
        proposal.random_numbers[idx] = random_numbers[idx] + proposal.random_numbers[idx]
    }

    // Update votes
    let ballot_boxes = &mut proposal.ballot_boxes.clone();
    for idx in 0..ballot_boxes.len() {
        let old_vote: PodEdwardsPoint = PodEdwardsPoint(ballot_boxes[idx]);
        let new_vote: PodEdwardsPoint = PodEdwardsPoint(votes[idx]);

        let sum = add_edwards(&old_vote, &new_vote).ok_or(ErrorCode::InvalidCurrentDate)?;
        proposal.ballot_boxes[idx] = sum.0
    }

    emit!(VoteEvent {
        proposal: proposal.key(),
        authority: ctx.accounts.authority.key(),
    });

    Ok(())
}
