use anchor_lang::prelude::*;
use solana_zk_token_sdk::curve25519::edwards::*;

use crate::constant::*;
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
#[instruction(votes: Vec<[u8; 32]>, random_numbers: Vec<u64>, salt: [u8; 32], proof: Vec<[u8; 32]>)]
pub struct Vote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,

    #[account(init, payer = authority, space = Receipt::LEN, seeds = [
        b"receipt".as_ref(),
        &salt,
        &proposal.key().to_bytes(),
        &authority.key().to_bytes()
      ],
      bump)]
    pub receipt: Account<'info, Receipt>,

    // programs
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn exec(
    ctx: Context<Vote>,
    votes: Vec<[u8; 32]>,
    random_numbers: Vec<u64>,
    salt: [u8; 32],
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    let receipt = &mut ctx.accounts.receipt;

    // Print receipt
    let current = current_timestamp().ok_or(ErrorCode::InvalidPoint)?;
    receipt.authority = ctx.accounts.authority.key();
    receipt.proposal = ctx.accounts.proposal.key();
    receipt.locked_date = current;
    receipt.salt = salt;
    let proposal = &mut ctx.accounts.proposal;

    // Verify time
    if proposal.is_ended(current) {
        return err!(ErrorCode::EndedProposal);
    }
    if !proposal.is_started(current) {
        return err!(ErrorCode::NotStartedProposal);
    }
    //Verify merkle proof
    if !proposal.verify(proof, receipt.hash()) {
        return err!(ErrorCode::InvalidMerkleProof);
    }
    //  Verify votes
    let valid_sum_vote = proposal
        .get_valid_sum(random_numbers.clone())
        .ok_or(ErrorCode::InvalidPoint)?;
    let sum_vote: &mut PodEdwardsPoint = &mut PodEdwardsPoint(ZERO);
    for idx in 0..votes.len() {
        let vote: PodEdwardsPoint = PodEdwardsPoint(votes[idx]);
        *sum_vote = add_edwards(&sum_vote, &vote).ok_or(ErrorCode::InvalidPoint)?;
    }
    if valid_sum_vote != sum_vote.0 {
        return err!(ErrorCode::InvalidVotes);
    }

    let ballot_boxes = &mut proposal.ballot_boxes.clone();
    // Update random numbers
    for idx in 0..proposal.random_numbers.len() {
        proposal.random_numbers[idx] = random_numbers[idx] + proposal.random_numbers[idx]
    }
    // Update votes
    for idx in 0..ballot_boxes.len() {
        let old_vote: PodEdwardsPoint = PodEdwardsPoint(ballot_boxes[idx]);
        let new_vote: PodEdwardsPoint = PodEdwardsPoint(votes[idx]);

        let sum = add_edwards(&old_vote, &new_vote).ok_or(ErrorCode::InvalidPoint)?;
        proposal.ballot_boxes[idx] = sum.0
    }

    emit!(VoteEvent {
        proposal: proposal.key(),
        authority: ctx.accounts.authority.key(),
    });

    Ok(())
}
