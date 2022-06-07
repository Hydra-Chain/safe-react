import GnosisSafe from '../abis'
import { contractCall, getContract } from './core'

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
