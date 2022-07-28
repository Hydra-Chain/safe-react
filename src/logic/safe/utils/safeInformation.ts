import { AddressEx, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'

import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { _getChainId } from 'src/config'
import { SAFE_SINGLETON_ADDRESS } from 'src/logic/hydra/contracts'
import { getSafeInfoEmpty } from 'src/logic/hydra/utils'
import {
  getGnosisProxyModules,
  getGnosisProxyNonce,
  getGnosisProxyOracle,
  getGnosisProxyOwners,
  getGnosisProxyThreshold,
  getGnosisProxyVersion,
  sendWithState,
} from 'src/logic/hydra/contractInteractions/utils'
import { fetchContractInfo } from 'src/logic/hydra/api/explorer'
import { Dispatch } from '../store/actions/types'
import { AppReduxState } from 'src/store'
import { fetchTransactions } from 'src/logic/hydra/api/explorer'
import { fetchContractTxHashes } from 'src/logic/hydra/api/explorer'

const GATEWAY_ERROR = /1337|42/

export const getSafeInfo = async (
  safeAddress: string,
  dispatch: Dispatch,
  state?: AppReduxState,
): Promise<SafeInfo> => {
  try {
    console.log('getSafeInfo safeAddress', safeAddress)
    if (state) {
    }
    const [contractInfo, txHashes, modules, nonce, version, owners, threshold, oracle] = await Promise.all([
      fetchContractInfo(safeAddress),
      fetchContractTxHashes(safeAddress, 'limit=10&offset=0'),
      dispatch(sendWithState(getGnosisProxyModules, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyNonce, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyVersion, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyOwners, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyThreshold, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyOracle, { safeAddress })),
    ])
    console.log(
      'contractInfo, modules, nonce, version, owners, threshold, oracle',
      contractInfo,
      modules,
      nonce,
      version,
      owners,
      threshold,
      oracle,
    )

    const txs = await fetchTransactions(txHashes.transactions)
    let unconfirmedTxs = 0
    txs?.forEach((t) => (!t.confirmations || t.confirmations <= 0) && unconfirmedTxs++)
    const safeInfo = getSafeInfoEmpty()
    safeInfo.address = {} as AddressEx
    safeInfo.address.value = safeAddress
    safeInfo.chainId = _getChainId()
    safeInfo.collectiblesTag = '0'
    safeInfo.txHistoryTag = contractInfo.transactionCount - unconfirmedTxs + ''
    safeInfo.txQueuedTag = unconfirmedTxs + ''
    safeInfo.fallbackHandler.value = '' // get
    safeInfo.guard = null as unknown as AddressEx
    safeInfo.implementation.value = SAFE_SINGLETON_ADDRESS
    safeInfo.threshold = threshold
    safeInfo.nonce = Number(nonce)
    safeInfo.version = version
    safeInfo.oracle = [{ value: oracle } as AddressEx]
    // console.log('before owners modules');

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
    // console.log('safeInfo', safeInfo);

    return safeInfo
  } catch (e) {
    const safeNotFound = GATEWAY_ERROR.test(e.message)
    throw new CodedException(safeNotFound ? Errors._605 : Errors._613, e.message)
  }
}
