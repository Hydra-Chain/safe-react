import { Dispatch } from 'redux'
import { ProposeTxBody } from 'src/logic/safe/transactions'
import { AppReduxState } from 'src/store'
import { NonPayableTransactionObject, PayableTx } from 'src/types/contracts/types'
import { ERC20, GnosisSafe, SnapshotOracle } from '../abis'
import { SAFE_PROXY_FACTORY_ADDRESS } from '../contracts'
import { contractCall, contractSend, getContract } from './core'
import { Decoder } from 'hydraweb3-js'
import { addressRemovePrefix, hydraToHexAddress } from '../utils'
import abi from 'ethjs-abi'

type Error = {
  message: string
  exceptedMessage: string
}

type HydraResult = {
  value: any
  error: Error | undefined
}

export const encodeMethodWithParams = (_abi: any, methodName: string, params: any[]) => {
  return abi.encodeMethod(
    _abi.find((method) => method.name === methodName),
    params,
  )
}

export const decodeMethodWithParams = (_abi: any, methodName: string, datahex: string) => {
  return abi.decodeEvent(
    _abi.find((method) => method.name === methodName),
    datahex,
  )
}

export const sendWithState =
  (
    next: (state: AppReduxState, nextProps: Record<string, unknown>) => Promise<any>,
    nextProps: Record<string, unknown>,
  ) =>
  async (dispatch: Dispatch, getState: () => AppReduxState): Promise<any> =>
    next(getState(), nextProps)

const _getSdkAccount = (state: AppReduxState) => {
  return {
    sdk: state.providers.hydraSDK,
    address: state.providers.account,
  }
}

export const getCallResult = (resp: any): HydraResult => {
  const result = {} as HydraResult
  if (resp?.executionResult?.excepted !== 'None') {
    result.error = {} as Error
    result.error.message = resp.executionResult.excepted
    result.error.exceptedMessage = resp.executionResult.exceptedMessage
    return result
  }
  // console.log('resp', resp);

  result.value = resp.executionResult.formattedOutput
  return result
}

export const getGnosisProxyNonce = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'nonce', [], address)
  const result = getCallResult(resp)
  // console.log('nonce', result);

  return result.value[0].toString()
}

export const getGnosisProxyModules = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getModules', [], address)
  const result = getCallResult(resp)
  console.log('modules', result)

  return result.value
}

export const getGnosisProxyVersion = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'VERSION', [], address)
  const result = getCallResult(resp)
  // console.log('version', result);

  return result.value[0]
}

export const getGnosisProxyOwners = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getOwners', [], address)
  const result = getCallResult(resp)
  // console.log('owners', result);

  return result.value
}

export const getGnosisProxyThreshold = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<number> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getThreshold', [], address)
  const result = getCallResult(resp)
  // console.log('threshold', result);

  return Number(result.value[0].toString())
}

export const getGnosisProxyOracle = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getOracle', [], address)
  const result = getCallResult(resp)
  // console.log('oracle', result);

  return result.value[0].toString()
}

export const getERC20Decimals = async (
  state: AppReduxState,
  { erc20Address }: { erc20Address: string },
): Promise<number> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, erc20Address.substring(2), ERC20), 'decimals', [], address)
  const result = getCallResult(resp)
  return result.value[0]
}

export const getERC20Name = async (
  state: AppReduxState,
  { erc20Address }: { erc20Address: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, erc20Address.substring(2), ERC20), 'name', [], address)
  const result = getCallResult(resp)
  return result.value[0]
}

export const getERC20Symbol = async (
  state: AppReduxState,
  { erc20Address }: { erc20Address: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, erc20Address.substring(2), ERC20), 'symbol', [], address)
  const result = getCallResult(resp)
  return result.value[0]
}

export const getGnosisProxyApprovedHash = async (
  state: AppReduxState,
  { safeAddress, safeTxHash, owner }: { safeAddress: string; safeTxHash: string; owner: string },
): Promise<number> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await sdk.provider.rawCall('callcontract', [
    addressRemovePrefix(safeAddress),
    encodeMethodWithParams(GnosisSafe, 'approvedHashes', [owner, safeTxHash]).substring(2),
    address,
  ])
  const resultdecoded = Decoder.decodeCall(resp, GnosisSafe, 'approvedHashes', true)
  const result = getCallResult(resultdecoded)
  return Number(result.value[0].toString())
}

export const setGnosisProxyOracle = async (
  state: AppReduxState,
  { safeAddress, oracle, gasLimit }: { safeAddress: string; oracle: string; gasLimit?: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractSend(
    getContract(sdk, safeAddress, GnosisSafe),
    'setOracle',
    [oracle],
    address,
    gasLimit ? Number(gasLimit) : 250000,
  )
  return resp
}

export const getGnosisProxyTransactionHash = async (
  state: AppReduxState,
  {
    safeInstance,
    to,
    value,
    data,
    operation,
    nonce,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
  }: // sender,
  // origin,
  // signature,
  ProposeTxBody,
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  try {
    const safeAddress = safeInstance.options.address
    const safeTxHashEnchodedABI = safeInstance.methods
      .getTransactionHash(
        to,
        value,
        data,
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver || '',
        nonce,
      )
      .encodeABI()

    console.log('safeAddress', safeAddress)

    const resp = await sdk.provider.rawCall('callcontract', [
      safeAddress.substring(2).toLowerCase(),
      safeTxHashEnchodedABI.substring(2),
      address,
    ])
    const resultdecoded = Decoder.decodeCall(resp, GnosisSafe, 'getTransactionHash', true)
    const result = getCallResult(resultdecoded)
    return ('0x' + result.value[0]) as string
  } catch (e) {
    throw new Error(e)
  }
  // const result = getCallResult(resp)
  // return Number(result.value[0].toString())
}

export const deploySafeWithNonce = async (
  state: AppReduxState,
  { deploymentTx }: { deploymentTx: NonPayableTransactionObject<string> },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  try {
    // const setInputBytecode = abi.encodeMethod(
    //   GnosisSafeProxyFactory[0],
    //   [SAFE_SINGLETON_ADDRESS, initializer, safeCreationSalt]
    // );
    console.log('deploymentTx', deploymentTx)

    const result = await sdk.provider.rawCall('sendtocontract', [
      SAFE_PROXY_FACTORY_ADDRESS.substring(2),
      deploymentTx.encodeABI().substring(2),
      0,
      300000,
      address,
    ])
    console.log('result', result)

    // const result = {hash: '505a1561c6fc810f1bbf44b2196021ebe1bb793c5b4bcf40bcb25b23d9b6703a'}
    return result
  } catch (e) {
    throw new Error(e)
  }
}

export const sendAddNewOwner = async (
  state: AppReduxState,
  {
    safeAddress,
    ownerAddress,
    threshold,
    gasLimit,
  }: {
    safeAddress: string
    ownerAddress: string
    threshold: string
    gasLimit: string
  },
): Promise<number> => {
  const { sdk, address } = _getSdkAccount(state)
  const oracleAddress: HydraResult = getCallResult(
    await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getOracle', [], address),
  )

  const oracleTx = await contractSend(
    getContract(sdk, oracleAddress.value[0], SnapshotOracle),
    'addAdminWithTreshhold',
    [ownerAddress, +threshold, safeAddress],
    address,
    Number(gasLimit),
  )

  return oracleTx
}

export const sendRemoveExistingOwner = async (
  state: AppReduxState,
  {
    safeAddress,
    ownerAddress,
    threshold,
  }: {
    safeAddress: string
    ownerAddress: string
    threshold: string
  },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const oracleAddress: HydraResult = getCallResult(
    await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'oracle', [], address),
  )
  console.log(
    'hydraToHexAddress(address), ownerAddress, +threshold, safeAddress',
    hydraToHexAddress(address),
    ownerAddress,
    +threshold,
    safeAddress,
  )

  const oracleTx = await contractSend(
    getContract(sdk, oracleAddress.value[0], SnapshotOracle),
    'removeAdmin',
    [hydraToHexAddress(address), ownerAddress, +threshold, safeAddress],
    address,
  )

  return oracleTx
}

// export const sendExecTransaction =
//   ({safeAddress,
//     safeVersion,
//     txRecipient,
//     txConfirmations,
//     txAmount,
//     txData,
//     operation,
//     from,
//     gasPrice,
//     gasToken,
//     gasLimit,
//     refundReceiver,
//     safeTxGas,
//     approvalAndExecution}: TransactionExecutionEstimationProps,
//     sigs: string) =>
//   async (dispatch: Dispatch, getState: () => AppReduxState): Promise<Boolean> => {
//     // console.log('sendExecTransaction');
//     if (safeVersion && txConfirmations && approvalAndExecution) {}
//     const state = getState()
//     const sdk = state.providers.hydraSDK
//     // console.log('after sdk');
//     // console.log('txRecipient, txAmount, txData, operation, safeTxGas, 0, gasPrice, gasToken, refundReceiver, sigs',
//     // txRecipient, txAmount, txData, operation, safeTxGas, 0, gasPrice, gasToken, refundReceiver, sigs);

//     try {
//       const tx = await contractSend(
//         getContract(sdk, safeAddress, GnosisSafe),
//         'execTransaction',
//         [txRecipient, txAmount, txData, operation, safeTxGas, 0, gasPrice, gasToken, refundReceiver, sigs],
//         from,
//         gasLimit ? Number(gasLimit) : 250000
//       )
//       // console.log('sendExecTransaction tx ', tx);
//       return true
//     } catch (e) {
//       console.log('sendExecTransaction err', e);

//       return false
//     }
//   }

export const safeGnosisSendAsset = async (
  state: AppReduxState,
  {
    tx,
    sendParams,
    safeAddress,
  }: {
    tx: NonPayableTransactionObject<void> | NonPayableTransactionObject<boolean> | string
    sendParams: PayableTx
    safeAddress: string
  },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  console.log('safeGnosisSendAsset tx', tx)
  // console.log('safeGnosisSendAsset txArgs', sendParams);
  // console.log('safeGnosisSendAsset safeAddress', safeAddress);
  const txEncoded = (typeof tx === 'string' ? tx : (tx as any).encodeABI()).substring(2)
  try {
    const result = await sdk.provider.rawCall('sendtocontract', [
      safeAddress.length === 40 ? safeAddress : safeAddress.substring(2),
      txEncoded,
      sendParams.value,
      sendParams.gas,
      address,
    ])

    // console.log('safeGnosisSendAsset result', result);

    return result
  } catch (e) {
    throw new Error(e)
  }
}
