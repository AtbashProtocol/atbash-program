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
        ballot_boxes: Vec<[u8; 32]>,
        random_numbers: Vec<u64>,
        merkle_root: [u8; 32],
    ) -> Result<()> {
        initialize_proposal::initialize(
            ctx,
            metadata,
            candidates,
            start_date,
            end_date,
            ballot_boxes,
            random_numbers,
            merkle_root,
        )
    }

    pub fn vote(
        ctx: Context<Vote>,
        votes: Vec<[u8; 32]>,
        random_numbers: Vec<u64>,
        salt: [u8; 32],
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        vote::exec(ctx, votes, random_numbers, salt, proof)
    }

    pub fn math(ctx: Context<InitMath>, p: [u8; 32]) -> Result<()> {
        formulae::exec_math_formulae(ctx, p)
    }
}
