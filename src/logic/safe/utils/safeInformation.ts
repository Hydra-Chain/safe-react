import { AddressEx, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'

import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { _getChainId } from 'src/config'
import { SAFE_SINGLETON_ADDRESS } from 'src/logic/hydra/contracts'
import { getSafeInfoEmpty } from 'src/logic/hydra/utils/emptySafeInfo'
import {
  getGnosisProxyModules,
  getGnosisProxyNonce,
  getGnosisProxyOwners,
  getGnosisProxyThreshold,
  getGnosisProxyVersion,
} from 'src/logic/hydra/contractInteractions/utils'

const GATEWAY_ERROR = /1337|42/

export const getSafeInfo = async (safeAddress: string, hydraSdk: any, hydraAddress: string): Promise<SafeInfo> => {
  try {
    const safeInfo = getSafeInfoEmpty()
    safeInfo.address = {} as AddressEx
    safeInfo.address.value = safeAddress
    safeInfo.chainId = _getChainId()
    safeInfo.collectiblesTag = '0'
    safeInfo.txHistoryTag = '0'
    safeInfo.txQueuedTag = '0'
    safeInfo.fallbackHandler.value = '' // get
    safeInfo.guard = null as unknown as AddressEx
    safeInfo.implementation.value = SAFE_SINGLETON_ADDRESS
    const modules = await getGnosisProxyModules(hydraSdk, safeAddress, hydraAddress)
    safeInfo.modules = modules[0].map((m: string) => {
      const addrEx = {} as AddressEx
      addrEx.value = m
      return addrEx
    })
    safeInfo.nonce = Number(await getGnosisProxyNonce(hydraSdk, safeAddress, hydraAddress))
    safeInfo.version = await getGnosisProxyVersion(hydraSdk, safeAddress, hydraAddress)

    const owners = await getGnosisProxyOwners(hydraSdk, safeAddress, hydraAddress)
    safeInfo.owners = owners[0].map((o: string) => {
      const addrEx = {} as AddressEx
      addrEx.value = o
      return addrEx
    })
    safeInfo.threshold = await getGnosisProxyThreshold(hydraSdk, safeAddress, hydraAddress)

    return safeInfo
  } catch (e) {
    const safeNotFound = GATEWAY_ERROR.test(e.message)
    throw new CodedException(safeNotFound ? Errors._605 : Errors._613, e.message)
  }
}
