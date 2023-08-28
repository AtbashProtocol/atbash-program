use anchor_lang::prelude::*;

pub mod instructions;
pub use instructions::*;

pub mod schema;
pub use schema::*;

pub mod errors;
pub use errors::*;

pub mod constant;
pub mod utils;

declare_id!("H7ZkmfbuFeMGWpo78N1vfpqmzxTrRUAvP7VmqEBTxzyA");

#[program]
pub mod atbash_program {
    use super::*;

    pub fn initialize_proposal(
        ctx: Context<InitializeProposal>,
        metadata: [u8; 32],
        candidates: Vec<Pubkey>,
        start_date: i64,
        end_date: i64,
    ) -> Result<()> {
        initialize_proposal::exec(ctx, metadata, candidates, start_date, end_date)
    }

    pub fn vote(ctx: Context<Vote>, amount: u64, candidate: Pubkey) -> Result<()> {
        vote::exec(ctx, amount, candidate)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
