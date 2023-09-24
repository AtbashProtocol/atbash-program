import { IdlAccounts, Wallet } from '@coral-xyz/anchor'
import { AtbashProgram } from '../target/types/atbash_program'

export type AnchorWallet = Wallet

export type ProposalData = IdlAccounts<AtbashProgram>['proposal']
