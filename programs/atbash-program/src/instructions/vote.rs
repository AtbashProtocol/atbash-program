use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};

use crate::schema::proposal::*;
use crate::schema::receipt::*;

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

    #[account(mut)]
    pub mint: Account<'info, token::Mint>,
    /// CHECK: Just a pure account
    #[account(seeds = [b"treasurer", &proposal.key().to_bytes()], bump)]
    pub treasurer: AccountInfo<'info>,

    #[account(
      mut,
      associated_token::mint = mint,
      associated_token::authority = treasurer
    )]
    pub treasury: Box<Account<'info, token::TokenAccount>>,

    #[account(
      init_if_needed,
      payer = authority,
      associated_token::mint = mint,
      associated_token::authority = authority
    )]
    pub src_associated_token_account: Box<Account<'info, token::TokenAccount>>,

    // programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, token::Token>,
    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn exec(ctx: Context<Vote>, amount: u64, candidate: Pubkey) -> Result<()> {
    let receipt = &mut ctx.accounts.receipt;
    // Validate time
    //Validate amount
    receipt.authority = ctx.accounts.authority.key();
    receipt.amount = amount;

    let proposal = &mut ctx.accounts.proposal;

    // Deposit tokens to the treasury
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.src_associated_token_account.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // calc new ballot_boxes
    for idx in 0..proposal.candidates.len() {
        if proposal.candidates[idx] == candidate {
            proposal.ballot_boxes[idx] = amount
        }
    }

    emit!(VoteEvent {
        proposal: proposal.key(),
        authority: ctx.accounts.authority.key(),
    });

    Ok(())
}
