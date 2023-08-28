use anchor_lang::prelude::*;
use anchor_spl::token;

use crate::errors::ErrorCode;
use crate::schema::proposal::*;
use crate::utils::current_timestamp;

#[event]
pub struct InitializeProposalEvent {
    pub proposal: Pubkey,
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub candidates: Vec<Pubkey>,
}

#[derive(Accounts)]
pub struct InitializeProposal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = Proposal::LEN)]
    pub proposal: Account<'info, Proposal>,

    pub mint: Account<'info, token::Mint>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn exec(
    ctx: Context<InitializeProposal>,
    metadata: [u8; 32],
    candidates: Vec<Pubkey>,
    start_date: i64,
    end_date: i64,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    // Validate data
    if start_date < current_timestamp().ok_or(ErrorCode::InvalidCurrentDate)? {
        return err!(ErrorCode::InvalidStartDate);
    }

    proposal.authority = ctx.accounts.authority.key();
    proposal.mint = ctx.accounts.mint.key();
    proposal.candidates = candidates.clone();
    proposal.metadata = metadata;
    proposal.start_date = start_date;
    proposal.end_date = end_date;
    proposal.ballot_boxes = vec![0; proposal.candidates.len()];

    emit!(InitializeProposalEvent {
        proposal: proposal.key(),
        authority: proposal.authority.key(),
        mint: proposal.mint.key(),
        candidates: candidates.clone()
    });

    Ok(())
}
