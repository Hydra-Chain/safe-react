import { NonPayableTransactionObject } from 'src/types/contracts/types.d'
import { TxArgs } from 'src/logic/safe/store/models/types/transaction'
import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'
import { encodeMethodWithParams } from 'src/logic/hydra/contractInteractions/utils'
import { GnosisSafe as GnosisSafeABI } from 'src/logic/hydra/abis'

export const getTransactionHash = async ({
  baseGas,
  data,
  gasPrice,
  gasToken,
  nonce,
  operation,
  refundReceiver,
  safeInstance,
  safeTxGas,
  sender,
  to,
  valueInWei,
}: TxArgs): Promise<string> => {
  const txHash = await safeInstance.methods
    .getTransactionHash(to, valueInWei, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce)
    .call({
      from: sender,
    })

  return txHash
}

export const getApprovalTransaction = (
  safeInstance: GnosisSafe,
  txHash: string,
  txArgs: TxArgs,
): NonPayableTransactionObject<void> => {
  try {
    const { to, valueInWei, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce } = txArgs
    return encodeMethodWithParams(GnosisSafeABI, 'approveHash', [
      txHash,
      to,
      valueInWei,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce,
    ])
  } catch (err) {
    console.error(`Error while approving transaction: ${err}`)
    throw err
  }
}

export const getExecutionTransaction = ({
  baseGas,
  data,
  gasPrice,
  gasToken,
  operation,
  refundReceiver,
  safeInstance,
  safeTxGas,
  sigs,
  to,
  valueInWei,
}: TxArgs): NonPayableTransactionObject<boolean> => {
  // console.log('getExecutionTransaction', to, valueInWei, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, sigs);
  if (safeInstance) {
  }
  try {
    return encodeMethodWithParams(GnosisSafeABI, 'execTransaction', [
      to,
      valueInWei,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      sigs,
    ])
    // return safeInstance.methods.execTransaction(
    //   to,
    //   valueInWei,
    //   data,
    //   operation,
    //   safeTxGas,
    //   baseGas,
    //   gasPrice,
    //   gasToken,
    //   refundReceiver,
    //   sigs,
    // )
  } catch (err) {
    console.error(`Error while creating transaction: ${err}`)

    throw err
  }
}
