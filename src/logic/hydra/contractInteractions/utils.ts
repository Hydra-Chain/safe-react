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
    address: state.providers.account?.substring(2),
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

  return result.value[0].toString()
}

export const getGnosisProxyModules = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getModules', [], address)
  const result = getCallResult(resp)
  return result.value
}

export const getGnosisProxyVersion = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'VERSION', [], address)
  const result = getCallResult(resp)

  return result.value[0]
}

export const getGnosisProxyOwners = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getOwners', [], address)
  const result = getCallResult(resp)

  return result.value
}

export const getGnosisProxyThreshold = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<number> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getThreshold', [], address)
  const result = getCallResult(resp)

  return Number(result.value[0].toString())
}

export const getGnosisProxyOracle = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<string> => {
  const { sdk, address } = _getSdkAccount(state)
  const resp = await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getOracle', [], address)
  const result = getCallResult(resp)

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
    const result = await sdk.provider.rawCall('sendtocontract', [
      SAFE_PROXY_FACTORY_ADDRESS.substring(2),
      deploymentTx.encodeABI().substring(2),
      0,
      300000,
      address,
    ])
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
    gasLimit,
  }: {
    safeAddress: string
    ownerAddress: string
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
    [ownerAddress],
    address,
    Number(gasLimit),
  )

  return oracleTx
}
export const sendChangeThresholdPercentage = async (
  state: AppReduxState,
  {
    thresholdPercentage,
    safeAddress,
    gasLimit,
  }: {
    thresholdPercentage: string
    safeAddress: string
    gasLimit: string
  },
): Promise<number> => {
  const { sdk, address } = _getSdkAccount(state)
  const oracle = await getGnosisProxyOracle(state, { safeAddress })

  const oracleTx = await contractSend(
    getContract(sdk, oracle, SnapshotOracle),
    'setThresholdPercentage',
    [thresholdPercentage],
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
  }: // threshold,
  {
    safeAddress: string
    ownerAddress: string
    // threshold: string
  },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const oracleAddress: HydraResult = getCallResult(
    await contractCall(getContract(sdk, safeAddress, GnosisSafe), 'getOracle', [], address),
  )
  const oracleTx = await contractSend(
    getContract(sdk, oracleAddress.value[0], SnapshotOracle),
    'removeAdmin',
    [hydraToHexAddress(address), ownerAddress],
    address,
  )

  return oracleTx
}

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
  const txEncoded = (typeof tx === 'string' ? tx : (tx as any).encodeABI()).substring(2)
  try {
    const result = await sdk.provider.rawCall('sendtocontract', [
      safeAddress.length === 40 ? safeAddress : safeAddress.substring(2),
      txEncoded,
      sendParams.value,
      sendParams.gas,
      address,
    ])
    return result
  } catch (e) {
    throw new Error(e)
  }
}

export const getSnapshotOracleAdminsByPercentage = async (
  state: AppReduxState,
  { safeAddress }: { safeAddress: string },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const threshold = await getGnosisProxyThreshold(state, { safeAddress })
  const oracle = await getGnosisProxyOracle(state, { safeAddress })
  const newThreshold = getCallResult(
    await contractCall(getContract(sdk, oracle, SnapshotOracle), 'getAdminsByPercentage', [threshold + 1], address),
  )

  return newThreshold.value[0].toString()
}

export const getSnapshotOracleThresholdPercentage = async (
  state: AppReduxState,
  { oracle }: { oracle: string },
): Promise<any> => {
  const { sdk, address } = _getSdkAccount(state)
  const thresholdPercentage = getCallResult(
    await contractCall(getContract(sdk, oracle, SnapshotOracle), 'thresholdPercentage', [], address),
  )

  return thresholdPercentage.value[0].toString()
}
