import { TypedDataUtils } from 'eth-sig-util'
import { TransactionReceipt } from 'web3-core'

import { TxArgs } from 'src/logic/safe/store/models/types/transaction'
import { getEip712MessageTypes, generateTypedDataFrom } from 'src/logic/safe/transactions/offchainSigner/EIP712Signer'

export const generateSafeTxHash = (safeAddress: string, safeVersion: string, txArgs: TxArgs): string => {
  if (safeAddress.length === 40) {
    safeAddress = '0x' + safeAddress
  }
  const typedData = generateTypedDataFrom({ safeAddress, safeVersion, ...txArgs })

  const messageTypes = getEip712MessageTypes(safeVersion)

  return `0x${TypedDataUtils.sign<typeof messageTypes>(typedData).toString('hex')}`
}

export const didTxRevert = (receipt: TransactionReceipt): boolean => {
  return receipt?.status === false
}
