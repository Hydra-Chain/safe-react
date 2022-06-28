import { getSafeWithNonceInitializer } from 'src/logic/contracts/safeContracts'
import { PayableTx } from 'src/types/contracts/types'
// import { GnosisSafe, GnosisSafeProxyFactory } from '../abis'
import { GnosisSafe, SnapshotOracle } from '../abis'
// import { SAFE_PROXY_FACTORY_ADDRESS, SAFE_SINGLETON_ADDRESS } from '../contracts'
import { contractCall, contractSend, getContract } from './core'

type Error = {
  message: string
  exceptedMessage: string
}

type HydraResult = {
  value: any
  error: Error | undefined
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

export const getGnosisProxyNonce = async (hydraSdk: any, safeAddress: string, userAddress: string): Promise<string> => {
  const resp = await contractCall(getContract(hydraSdk, safeAddress, GnosisSafe), 'nonce', [], userAddress)
  const result = getCallResult(resp)
  return result.value[0].toString()
}

export const getGnosisProxyModules = async (hydraSdk: any, safeAddress: string, userAddress: string): Promise<any> => {
  const resp = await contractCall(getContract(hydraSdk, safeAddress, GnosisSafe), 'getModules', [], userAddress)
  const result = getCallResult(resp)
  return result.value
}

export const getGnosisProxyVersion = async (
  hydraSdk: any,
  safeAddress: string,
  userAddress: string,
): Promise<string> => {
  const resp = await contractCall(getContract(hydraSdk, safeAddress, GnosisSafe), 'VERSION', [], userAddress)
  const result = getCallResult(resp)
  return result.value[0]
}

export const getGnosisProxyOwners = async (hydraSdk: any, safeAddress: string, userAddress: string): Promise<any> => {
  const resp = await contractCall(getContract(hydraSdk, safeAddress, GnosisSafe), 'getOwners', [], userAddress)
  const result = getCallResult(resp)
  return result.value
}

export const getGnosisProxyThreshold = async (
  hydraSdk: any,
  safeAddress: string,
  userAddress: string,
): Promise<number> => {
  const resp = await contractCall(getContract(hydraSdk, safeAddress, GnosisSafe), 'getThreshold', [], userAddress)
  const result = getCallResult(resp)
  return Number(result.value[0].toString())
}

export const deploySafeWithNonce = async (
  sendParams: PayableTx,
  ownerAddresses: any[],
  confirmations: number,
  safeCreationSalt: number,
  hydraSdk: any,
  userAddress: string,
): Promise<void> => {
  const initializer = getSafeWithNonceInitializer(ownerAddresses, confirmations)
  console.log('sendParams', sendParams)
  console.log('ownerAddresses', ownerAddresses)
  console.log('confirmations', confirmations)
  console.log('safeCreationSalt', safeCreationSalt)
  console.log('hydraSdk', hydraSdk)
  console.log('userAddress', userAddress)
  console.log('initializer', initializer)

  // const resp = await contractSend(
  //   getContract(hydraSdk, SAFE_PROXY_FACTORY_ADDRESS, GnosisSafeProxyFactory),
  //   'createProxyWithNonce',
  //   // address _mastercopy, bytes memory initializer, uint256 saltNonce
  //   [SAFE_SINGLETON_ADDRESS, initializer.substring(2), safeCreationSalt],
  //   userAddress
  // )
  // const result = getCallResult(resp)
  // return Number(result.value[0].toString())
}

export const sendAddNewOwner = async (
  hydraSdk: any,
  safeAddress: string,
  userAddress: string,
  ownerAddress: string,
  threshold: number,
): Promise<number> => {
  const oracleAddress: HydraResult = getCallResult(
    await contractCall(getContract(hydraSdk, safeAddress, GnosisSafe), 'oracle', [], userAddress),
  )

  const oracleTx = await contractSend(
    getContract(hydraSdk, oracleAddress.value[0], SnapshotOracle),
    'addAdminWithTreshhold',
    [ownerAddress, threshold, safeAddress],
    userAddress,
  )

  return oracleTx
}
