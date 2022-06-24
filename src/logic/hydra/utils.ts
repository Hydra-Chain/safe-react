import { TokenInfo } from '@gnosis.pm/safe-apps-sdk'
import {
  AddressEx,
  SafeInfo,
  Transaction,
  TransactionListItem,
  TransactionListPage,
  TransactionStatus,
  TransactionSummary,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { Encoder, Decoder } from 'hydraweb3-js'
import abiDecoder from 'abi-decoder'
import { Log } from 'web3-core'
import { ERC20, GnosisSafe, GnosisSafeProxyFactory } from './abis'

// Init abiDecoder with ProxyCreation ABI
abiDecoder.addABI(GnosisSafe)
abiDecoder.addABI(GnosisSafeProxyFactory)
abiDecoder.addABI(ERC20)

export const getSafeLogs = (logs: Log[]): any => {
  for (let i = 0; i < logs.length; i++) {
    logs[i].data = '0x' + logs[i].data
    for (let y = 0; y < logs[i].topics.length; y++) {
      logs[i].topics[y] = '0x' + logs[i].topics[y]
    }
  }
  return abiDecoder.decodeLogs(logs)
}

export const getTransactionListPageEmpty = (): TransactionListPage => {
  const tlp = {} as TransactionListPage
  tlp.results = [] as TransactionListItem[]
  return tlp
}

export const getTransactionItemList = async (transaction: any, callback: any): Promise<Transaction | null> => {
  let tli: Transaction | null = null
  transaction.outputs.forEach(async (output) => {
    const receipt = output.receipt
    if (!receipt) return
    tli = {} as Transaction
    tli.conflictType = receipt.excepted ?? 'End'
    tli.type = 'TRANSACTION'
    tli.transaction = {} as TransactionSummary
    tli.transaction.id = 'hydra_' + '0x' + receipt.contractAddressHex + '_0x' + transaction.id
    tli.transaction.timestamp = transaction.timestamp
    tli.transaction.txStatus = receipt.excepted === 'None' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED
    tli = await callback(tli, receipt)
  })
  return tli
}

export const getSafeInfoEmpty = (): SafeInfo => {
  const safeInfo = {} as SafeInfo
  safeInfo.address = {} as AddressEx
  safeInfo.fallbackHandler = {} as AddressEx
  safeInfo.guard = {} as AddressEx
  safeInfo.implementation = {} as AddressEx
  safeInfo.modules = [] as AddressEx[]
  safeInfo.owners = [] as AddressEx[]
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

export const hydraToHexAddress = (address: string, withPrefix = false): string => {
  const addressHex = Encoder.addressToHex(address)
  const addr = addressHex.substr(addressHex.length - 40)
  return withPrefix ? '0x' + addr : addr
}

export const hydraFromHexAddress = (address: string): string => {
  const addressHex = Decoder.toHydraAddress(address)
  return addressHex
}
