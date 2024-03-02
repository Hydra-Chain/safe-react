import { AddressEx } from '@gnosis.pm/safe-react-gateway-sdk'

import { CodedException, Errors } from 'src/logic/exceptions/CodedException'
import { _getChainId } from 'src/config'
import { getSingletonAddress } from 'src/logic/hydra/contracts'
import { getSafeInfoEmpty, SafeInfoHydra } from 'src/logic/hydra/utils'
import {
  getGnosisProxyModules,
  getGnosisProxyNonce,
  getGnosisProxyOwners,
  getGnosisProxyThreshold,
  getGnosisProxyVersion,
  sendWithState,
} from 'src/logic/hydra/contractInteractions/utils'
import { fetchContractInfo } from 'src/logic/hydra/api/explorer'
import { Dispatch } from '../store/actions/types'
import { AppReduxState } from 'src/store'
// import { fetchTransactions } from 'src/logic/hydra/api/explorer'
// import { fetchContractTxHashes } from 'src/logic/hydra/api/explorer'

const GATEWAY_ERROR = /1337|42/

export const getSafeInfo = async (
  safeAddress: string,
  dispatch: Dispatch,
  state?: AppReduxState,
): Promise<SafeInfoHydra> => {
  try {
    console.log('safeAddres1s', safeAddress)
    const [contractInfo, modules, nonce, version, owners, threshold] = await Promise.all([
      fetchContractInfo(safeAddress),
      // fetchContractTxHashes(safeAddress, 'limit=10&offset=0'),
      dispatch(sendWithState(getGnosisProxyModules, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyNonce, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyVersion, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyOwners, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyThreshold, { safeAddress })),
      // dispatch(sendWithState(getGnosisProxyOracle, { safeAddress })),
    ])
    console.log('after calls', contractInfo, modules, nonce, version, owners, threshold)
    if (state && contractInfo) {
    }
    // let thresholdPercentage = ''
    // if (oracle) {
    //   thresholdPercentage = await dispatch(sendWithState(getSnapshotOracleThresholdPercentage, { oracle }))
    // }
    // console.log(
    //   'contractInfo, modules, nonce, version, owners, threshold',
    //   contractInfo,
    //   modules,
    //   nonce,
    //   version,
    //   owners,
    //   threshold,
    //   // oracle,
    //   // thresholdPercentage,
    // )
    // console.log('txHashes', txHashes);

    // const txs = await fetchTransactions(txHashes.transactions)
    // let unconfirmedTxs = 0
    // txs?.forEach((t) => (!t.confirmations || t.confirmations <= 0) && unconfirmedTxs++)
    const safeInfo = getSafeInfoEmpty()
    safeInfo.address = {} as AddressEx
    safeInfo.address.value = safeAddress
    safeInfo.chainId = _getChainId()
    safeInfo.collectiblesTag = '0'
    safeInfo.txHistoryTag = '0'
    safeInfo.txQueuedTag = '0'
    safeInfo.fallbackHandler.value = '' // get
    safeInfo.guard = null as unknown as AddressEx
    safeInfo.implementation.value = getSingletonAddress(safeInfo.chainId)
    safeInfo.threshold = threshold
    safeInfo.nonce = Number(nonce)
    safeInfo.version = version
    // safeInfo.oracle = [{ value: oracle } as AddressEx]
    // safeInfo.thresholdPercentage = Number(thresholdPercentage)

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
    console.log('safeInfo------------------', safeInfo)
    return safeInfo
  } catch (e) {
    const safeNotFound = GATEWAY_ERROR.test(e.message)
    throw new CodedException(safeNotFound ? Errors._605 : Errors._613, e.message)
  }
}
