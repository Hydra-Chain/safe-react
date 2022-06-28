import { AddressEx, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'

import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { _getChainId } from 'src/config'
import { SAFE_SINGLETON_ADDRESS } from 'src/logic/hydra/contracts'
import { getSafeInfoEmpty } from 'src/logic/hydra/utils'
import {
  getGnosisProxyModules,
  getGnosisProxyNonce,
  getGnosisProxyOwners,
  getGnosisProxyThreshold,
  getGnosisProxyVersion,
} from 'src/logic/hydra/contractInteractions/utils'
import { fetchContractInfo } from 'src/logic/hydra/api/explorer'

const GATEWAY_ERROR = /1337|42/

export const getSafeInfo = async (safeAddress: string, hydraSdk: any, hydraAddress: string): Promise<SafeInfo> => {
  try {
    const [{ transactionCount }, modules, nonce, version, owners, threshold] = await Promise.all([
      fetchContractInfo(safeAddress),
      getGnosisProxyModules(hydraSdk, safeAddress, hydraAddress),
      getGnosisProxyNonce(hydraSdk, safeAddress, hydraAddress),
      getGnosisProxyVersion(hydraSdk, safeAddress, hydraAddress),
      getGnosisProxyOwners(hydraSdk, safeAddress, hydraAddress),
      getGnosisProxyThreshold(hydraSdk, safeAddress, hydraAddress)
    ])
    const safeInfo = getSafeInfoEmpty()
    safeInfo.address = {} as AddressEx
    safeInfo.address.value = safeAddress
    safeInfo.chainId = _getChainId()
    safeInfo.collectiblesTag = '0'
    safeInfo.txHistoryTag = transactionCount
    safeInfo.txQueuedTag = '0'
    safeInfo.fallbackHandler.value = '' // get
    safeInfo.guard = null as unknown as AddressEx
    safeInfo.implementation.value = SAFE_SINGLETON_ADDRESS
    safeInfo.threshold = threshold
    safeInfo.nonce = Number(nonce)
    safeInfo.version = version
    safeInfo.owners = owners[0].map((o: string) => {
      const addrEx = {} as AddressEx
      addrEx.value = o
      return addrEx
    })
    safeInfo.modules = modules[0].map((m: string) => {
      const addrEx = {} as AddressEx
      addrEx.value = m
      return addrEx
    })

    console.log('safeinfo', safeInfo);
    

    return safeInfo
  } catch (e) {
    const safeNotFound = GATEWAY_ERROR.test(e.message)
    throw new CodedException(safeNotFound ? Errors._605 : Errors._613, e.message)
  }
}
