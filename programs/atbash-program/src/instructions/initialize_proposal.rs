use anchor_lang::prelude::*;

use crate::schema::proposal::*;

#[event]
pub struct InitializeProposalEvent {
    pub proposal: Pubkey,
    pub authority: Pubkey,
    pub candidates: Vec<Pubkey>,
    pub merkle_root: [u8; 32],
    pub metadata: [u8; 32],
}

#[derive(Accounts)]
pub struct InitializeProposal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = Proposal::LEN)]
    pub proposal: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize(
    ctx: Context<InitializeProposal>,
    metadata: [u8; 32],
    candidates: Vec<Pubkey>,
    start_date: i64,
    end_date: i64,
    ballot_boxes: Vec<[u8; 32]>,
    random_numbers: Vec<u64>,
    merkle_root: [u8; 32],
    commitment: u64,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;

    proposal.authority = ctx.accounts.authority.key();
    proposal.candidates = candidates.clone();
    proposal.metadata = metadata;
    proposal.start_date = start_date;
    proposal.end_date = end_date;
    proposal.ballot_boxes = ballot_boxes;
    proposal.random_numbers = random_numbers;
    proposal.merkle_root = merkle_root;
    proposal.commitment = commitment;
    // proposal.result = vec![0; candidates.len()];

    emit!(InitializeProposalEvent {
        proposal: proposal.key(),
        authority: proposal.authority.key(),
        candidates: candidates.clone(),
        merkle_root,
        metadata
    });

    Ok(())
}
