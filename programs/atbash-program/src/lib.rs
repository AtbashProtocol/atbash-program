use anchor_lang::prelude::*;

pub mod instructions;
pub use instructions::*;

pub mod schema;
pub use schema::*;

pub mod errors;
pub use errors::*;

pub mod constant;
pub use constant::*;

pub mod utils;
pub use utils::*;

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
        initialize_proposal::initialize(ctx, metadata, candidates, start_date, end_date)
    }

    pub fn vote(ctx: Context<Vote>, amount: u64, candidate: Pubkey) -> Result<()> {
        vote::exec(ctx, amount, candidate)
    }

    pub fn math(ctx: Context<InitMath>, p: [u8; 32]) -> Result<()> {
        formulae::exec_math_formulae(ctx, p)
    }
}
