import {
  AddOwner,
  AddressEx,
  Creation,
  DataDecoded,
  Erc20Transfer,
  Parameter,
  SettingsChange,
  SettingsInfoType,
  Transaction,
  Transfer,
  TransferDirection,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { getGnosisProxyThreshold } from './contractInteractions/utils'
import { SAFE_PROXY_FACTORY_ADDRESS, SAFE_SINGLETON_ADDRESS } from './contracts'
import { hydraToHexAddress } from './utils'

export const addOwner = async (
  tli: Transaction,
  log: any,
  hydraSdk: any,
  safeAddress: string,
  userAddress: string,
): Promise<Transaction> => {
  const threshold = log.events.find((e) => e.name === '_threshold')?.value
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as AddOwner
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.ADD_OWNER
  tli.transaction.txInfo.settingsInfo.owner = (tli.transaction.txInfo.settingsInfo.owner ?? {}) as AddressEx
  tli.transaction.txInfo.settingsInfo.owner.value = log.events.find((e) => e.name === 'owner').value
  tli.transaction.txInfo.settingsInfo.threshold =
    threshold ?? (await getGnosisProxyThreshold(hydraSdk, safeAddress, userAddress))
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'addOwnerWithThreshold'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  if (!threshold) {
    log.events.push({
      name: '_threshold',
      type: 'uint256',
      value: tli.transaction.txInfo.settingsInfo.threshold.toString(),
    })
  }
  tli.transaction.txInfo.dataDecoded.parameters = log.events
  return tli
}

export const transfer = (t: any, tli: Transaction, log: any, safeAddress: string, receipt: any): Transaction => {
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Transfer
  tli.transaction.txInfo.type = 'Transfer'
  const recipient = log.events.find((e) => e.name === 'from').value
  tli.transaction.txInfo.sender = recipient
  tli.transaction.txInfo.recipient = log.events.find((e) => e.name === 'to').value
  tli.transaction.txInfo.direction =
    recipient.substring(2) === safeAddress ? TransferDirection.INCOMING : TransferDirection.INCOMING
  tli.transaction.txInfo.transferInfo = (tli.transaction.txInfo.transferInfo ?? {}) as Erc20Transfer
  const token = t.qrc20TokenTransfers.find((transfer) => transfer.addressHex === receipt.contractAddressHex)
  tli.transaction.txInfo.transferInfo.decimals = token.decimals
  tli.transaction.txInfo.transferInfo.tokenAddress = '0x' + token.addressHex
  tli.transaction.txInfo.transferInfo.tokenName = token.name
  tli.transaction.txInfo.transferInfo.tokenSymbol = token.symbol
  tli.transaction.txInfo.transferInfo.value = log.events.find((e) => e.name === 'value').value
  tli.transaction.txInfo.transferInfo.logoUri = ''
  return tli
}

export const creation = (t: any, tli: Transaction, receipt: any): Transaction => {
  tli.transaction.txInfo = {} as Creation
  tli.transaction.txInfo.creator = {} as AddressEx
  tli.transaction.txInfo.factory = {} as AddressEx
  tli.transaction.txInfo.implementation = {} as AddressEx
  tli.transaction.txInfo.type = 'Creation'
  tli.transaction.txInfo.creator.value = hydraToHexAddress(receipt.sender, true)
  tli.transaction.txInfo.factory.value = SAFE_PROXY_FACTORY_ADDRESS
  tli.transaction.txInfo.implementation.value = SAFE_SINGLETON_ADDRESS
  tli.transaction.txInfo.transactionHash = '0x' + t.id
  return tli
}
