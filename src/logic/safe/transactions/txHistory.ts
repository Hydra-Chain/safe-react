import {
  AddressEx,
  MultisigTransactionRequest,
  TransactionDetails,
  TransactionStatus,
} from '@gnosis.pm/safe-react-gateway-sdk'

import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'
// import { _getChainId } from 'src/config'

import { TxArgs } from '../store/models/types/transaction'
import { Dispatch } from '../store/actions/types'
import { Custom, DetailedExecutionInfo, TransactionData } from '@gnosis.pm/safe-apps-sdk'

export type ProposeTxBody = Omit<MultisigTransactionRequest, 'safeTxHash'> & {
  safeInstance: GnosisSafe
  data: string | number[]
}

// const calculateBodyFrom = async ({
//   safeInstance,
//   to,
//   value,
//   data,
//   operation,
//   nonce,
//   safeTxGas,
//   baseGas,
//   gasPrice,
//   gasToken,
//   refundReceiver,
//   sender,
//   origin,
//   signature,
// }: ProposeTxBody,
// dispatch: Dispatch
// ): Promise<MultisigTransactionRequest> => {
//   console.log('calculateBodyFrom');

//   const safeTxHash = await dispatch(sendWithState(getGnosisProxyTransactionHash, {
//     safeInstance,
//     to,
//     value,
//     data,
//     operation,
//     nonce,
//     safeTxGas,
//     baseGas,
//     gasPrice,
//     gasToken,
//     refundReceiver,
//     sender,
//     origin,
//     signature,
//   }))
//   // const safeTxHashEnchodedABI = await safeInstance.methods
//   //   .getTransactionHash(to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver || '', nonce)
//   //   .encodeABI()
//   return {
//     to: to,
//     value,
//     data,
//     operation,
//     nonce: nonce.toString(),
//     safeTxGas: safeTxGas.toString(),
//     baseGas: baseGas.toString(),
//     gasPrice,
//     gasToken,
//     refundReceiver,
//     safeTxHash,
//     sender: sender,
//     origin,
//     signature,
//   }
// }

type SaveTxToHistoryTypes = TxArgs & { origin?: string | null; signature?: string }

export const saveTxToHistory = async (
  {
    baseGas,
    data,
    gasPrice,
    gasToken,
    nonce,
    operation,
    origin,
    refundReceiver,
    safeInstance,
    safeTxGas,
    sender,
    signature,
    to,
    valueInWei,
  }: SaveTxToHistoryTypes,
  dispatch: Dispatch,
  txHash: string | undefined,
): Promise<TransactionDetails> => {
  if (!txHash) return {} as TransactionDetails
  if (
    baseGas &&
    data &&
    gasPrice &&
    gasToken &&
    nonce &&
    origin &&
    refundReceiver &&
    safeTxGas &&
    sender &&
    signature
  ) {
  }
  const address = safeInstance.options.address
  const txDetails = {} as TransactionDetails
  txDetails.executedAt = +Date.now()
  txDetails.txHash = txHash
  txDetails.txId = 'multisig_' + address.toLowerCase() + '_' + txHash
  txDetails.txStatus = TransactionStatus.PENDING
  txDetails.txData = {} as TransactionData
  txDetails.txData.operation = operation
  txDetails.txData.to = { value: to } as AddressEx
  txDetails.txData.value = valueInWei
  txDetails.detailedExecutionInfo = {} as DetailedExecutionInfo
  txDetails.detailedExecutionInfo.type = 'MULTISIG'
  txDetails.txInfo = {} as Custom
  txDetails.txInfo.type = 'Custom'
  txDetails.txInfo.to = { value: to } as AddressEx

  return txDetails
}
