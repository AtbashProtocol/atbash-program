import { IdlAccounts } from '@coral-xyz/anchor'
import { AtbashProgram } from '../target/types/atbash_program'

export type ProposalData = IdlAccounts<AtbashProgram>['proposal']
export type ReceiptData = IdlAccounts<AtbashProgram>['receipt']
