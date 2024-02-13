import { TokenInfo } from '@gnosis.pm/safe-apps-sdk'
import {
  AddressEx,
  SafeInfo,
  TransactionDetails,
  TransactionListItem,
  TransactionListPage,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { Encoder, Decoder } from 'hydraweb3-js'
import abiDecoder from 'abi-decoder'
import { Log } from 'web3-core'
import { ERC20, GnosisSafe, GnosisSafeProxyFactory, SnapshotOracle } from './abis'
import { Dispatch } from '../safe/store/actions/types'
import { sendWithState, getGnosisProxyApprovedHash } from './contractInteractions/utils'

export interface SafeInfoHydra extends SafeInfo {
  oracle: AddressEx[]
  thresholdPercentage: number
}

// Init abiDecoder with ProxyCreation ABI
abiDecoder.addABI(GnosisSafe)
abiDecoder.addABI(GnosisSafeProxyFactory)
abiDecoder.addABI(ERC20)
abiDecoder.addABI(SnapshotOracle)

export let currentTxWaitingExecutionDetails: TransactionDetails | undefined

export const setCurrentTxWaitingExecutionDetails = (value?: TransactionDetails) => {
  currentTxWaitingExecutionDetails = value
}

export const decodeMethod = (txData: string) => {
  return abiDecoder.decodeMethod(txData)
}

export const getSafeLogs = (logs: Log[]): any => {
  const _logs = [...logs]
  for (let i = 0; i < logs.length; i++) {
    _logs[i].data = logs[i].data.startsWith('0x') ? logs[i].data : '0x' + logs[i].data
    for (let y = 0; y < logs[i].topics.length; y++) {
      _logs[i].topics[y] = logs[i].topics[y].startsWith('0x') ? logs[i].topics[y] : '0x' + logs[i].topics[y]
    }
  }
  return _logs.length > 0 ? abiDecoder.decodeLogs(_logs) : _logs
}

export const getTransactionListPageEmpty = (): TransactionListPage => {
  const tlp = {} as TransactionListPage
  tlp.results = [] as TransactionListItem[]
  return tlp
}

export const getSafeInfoEmpty = (): SafeInfoHydra => {
  const safeInfo = {} as SafeInfoHydra
  safeInfo.address = {} as AddressEx
  safeInfo.fallbackHandler = {} as AddressEx
  safeInfo.guard = {} as AddressEx
  safeInfo.implementation = {} as AddressEx
  safeInfo.modules = [] as AddressEx[]
  safeInfo.owners = [] as AddressEx[]
  safeInfo.oracle = [] as AddressEx[]
  return safeInfo
}

export const getItemEmpty = (): {
  tokenInfo: TokenInfo
  balance: string
  fiatBalance: string
  fiatConversion: string
} => {
  return {
    tokenInfo: {} as TokenInfo,
    balance: '',
    fiatBalance: '',
    fiatConversion: '',
  }
}

export const hydraToHexAddress = (address: string, chainId: string, withPrefix = false): string => {
  if (!address) return ''
  const addressHex = Encoder.addressToHex(address, chainId === '1')
  const addr = addressHex.substr(addressHex.length - 40)
  return withPrefix ? '0x' + addr : addr
}

export const hydraFromHexAddress = (address: string, chainId: string): string => {
  if (!address) return ''
  const addressHex = Decoder.toHydraAddress(address, chainId === '1')
  return addressHex
}

export const addressRemovePrefix = (address: string) => {
  if (address?.length === 40) return address
  return address.substring(2)
}

export const safeTxHashRemovePrefix = (safeTxHash: string) => {
  if (safeTxHash?.length === 64) return safeTxHash
  return safeTxHash.substring(2)
}

export const isHashConsumed = async (safeAddress: string, logApprovedHash: any, dispatch: Dispatch) => {
  const safeTxHash = logApprovedHash.events.find((e) => e.name === 'approvedHash').value
  const owner = logApprovedHash.events.find((e) => e.name === 'owner').value
  const consumed: number = await dispatch(sendWithState(getGnosisProxyApprovedHash, { safeAddress, safeTxHash, owner }))

  return consumed === 0
}
