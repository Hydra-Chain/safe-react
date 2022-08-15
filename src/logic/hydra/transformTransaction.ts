import { NativeCoinTransfer } from '@gnosis.pm/safe-apps-sdk'
import {
  AddOwner,
  AddressEx,
  ChangeThreshold,
  Creation,
  DataDecoded,
  Erc20Transfer,
  MultisigExecutionInfo,
  Parameter,
  RemoveOwner,
  SettingsChange,
  SettingsInfoType,
  Transaction,
  TransactionStatus,
  TransactionSummary,
  TransactionTokenType,
  Transfer,
  TransferDirection,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { Log } from 'web3-core'
import { Dispatch } from '../safe/store/actions/types'
import { EMPTY_DATA } from '../wallets/ethTransactions'
import { ERC20 } from './abis'
import { getLocalStorageApprovedTransactionSchema, setLocalStorageApprovedTransactionSchema } from './api/explorer'
import {
  getGnosisProxyOwners,
  getGnosisProxyThreshold,
  sendWithState,
  getGnosisProxyApprovedHash,
  getGnosisProxyNonce,
  decodeMethodWithParams,
  getERC20Decimals,
  getERC20Name,
  getERC20Symbol,
} from './contractInteractions/utils'
import { SAFE_PROXY_FACTORY_ADDRESS, SAFE_SINGLETON_ADDRESS } from './contracts'
import { getSafeLogs, hydraToHexAddress, isHashConsumed } from './utils'

export const getTransactionItemList = async (transaction: any, callback: any): Promise<Transaction | null> => {
  let tli: Transaction | null = null
  for (let i = 0; i < transaction.outputs.length; i++) {
    const output = transaction.outputs[i]
    const receipt = output.receipt
    if (!receipt) continue
    tli = {} as Transaction
    tli.conflictType = receipt.excepted ?? 'End'
    tli.type = 'TRANSACTION'
    tli.transaction = {} as TransactionSummary
    tli.transaction.id = 'multisig_' + '0x' + receipt.contractAddressHex + '_0x' + transaction.id
    tli.transaction.timestamp = transaction.timestamp * 1000
    tli.transaction.txStatus = receipt.excepted === 'None' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED
    tli = await callback(tli, receipt, i)
  }
  return tli
}

const getPreValidatedSignatures = (from: string, initialString: string = EMPTY_DATA): string => {
  return `${initialString}000000000000000000000000${from.replace(
    EMPTY_DATA,
    '',
  )}000000000000000000000000000000000000000000000000000000000000000001`
}

export const approvedHash = async (safeAddress: string, transaction: any, dispatch: Dispatch): Promise<Transaction> => {
  const tli = {} as Transaction
  for (const output of transaction.outputs) {
    const receipt = output.receipt
    if (!receipt) continue
    const logs = getSafeLogs(receipt.logs as Log[])
    const logApprovedHash = logs.find((log) => log.name === 'ApproveHash')
    const logExecutionParams = logs.find((log) => log.name === 'ExecutionParams')
    if (!logApprovedHash) continue
    const _isHashConsumed = await isHashConsumed(safeAddress, logApprovedHash, dispatch)
    if (_isHashConsumed) {
      const safeTxHash = logApprovedHash.events.find((e) => e.name === 'approvedHash').value
      const approvedTransactionSchema = getLocalStorageApprovedTransactionSchema()
      if (approvedTransactionSchema[safeTxHash]) {
        delete approvedTransactionSchema[safeTxHash]
        setLocalStorageApprovedTransactionSchema(approvedTransactionSchema)
      }
      continue
    }
    let confirmationsSubmitted = 1
    const [threshold, nonce, owners] = await Promise.all([
      dispatch(sendWithState(getGnosisProxyThreshold, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyNonce, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyOwners, { safeAddress })),
    ])
    if (Number(nonce) > logExecutionParams.events.find((e) => e.name === '_nonce').value) {
      continue
    }
    const safeTxHash = logApprovedHash.events.find((e) => e.name === 'approvedHash').value
    const ownerApproved = logApprovedHash.events.find((e) => e.name === 'owner').value
    const approvedOwnersHashPromises = owners[0]
      .map((o) => {
        if (ownerApproved === '0x' + o) return undefined
        return {
          owner: o,
          promise: dispatch(sendWithState(getGnosisProxyApprovedHash, { safeAddress, safeTxHash, owner: '0x' + o })),
        }
      })
      .filter((o) => o !== undefined)
    const approvedOwnersHash = await Promise.all(approvedOwnersHashPromises.map((p) => p.promise))
    const missingSigners: AddressEx[] = []
    const alreadySignedSigners: AddressEx[] = [{ value: ownerApproved } as AddressEx]
    approvedOwnersHash.forEach((approved: number, i: number) => {
      if (approved === 0) {
        missingSigners.push({ value: '0x' + approvedOwnersHashPromises[i].owner } as AddressEx)
        return
      }
      alreadySignedSigners.push({ value: '0x' + approvedOwnersHashPromises[i].owner } as AddressEx)
      confirmationsSubmitted += 1
    })

    // const logOwnerApproved = logs.find(log => log.name === )
    tli.conflictType = 'None'
    tli.type = 'TRANSACTION'
    tli.transaction = {} as TransactionSummary
    tli.transaction.id = 'multisig_' + '0x' + safeAddress + '_0x' + transaction.id
    tli.transaction.timestamp = transaction.timestamp * 1000
    tli.transaction.txStatus =
      confirmationsSubmitted === 0
        ? TransactionStatus.PENDING
        : confirmationsSubmitted >= threshold
        ? TransactionStatus.AWAITING_EXECUTION
        : TransactionStatus.AWAITING_CONFIRMATIONS
    const executionInfo = {} as any
    executionInfo.type = 'MULTISIG'
    executionInfo.confirmationsRequired = threshold
    executionInfo.safeTxHash = safeTxHash
    executionInfo.confirmationsSubmitted = confirmationsSubmitted
    executionInfo.missingSigners = missingSigners
    executionInfo.nonce = nonce
    executionInfo.signers = owners[0].map((o) => ({ value: o }))
    executionInfo.refundReceiver = { value: logExecutionParams.events.find((e) => e.name === 'refundReceiver').value }
    executionInfo.confirmations = alreadySignedSigners.map((signer) => {
      return {
        signer,
        signature: getPreValidatedSignatures(signer.value),
      }
    })
    executionInfo.hydraExecution = {}
    logExecutionParams.events.forEach((e) => {
      executionInfo.hydraExecution[e.name] = e.value
      if (e.name === 'refundReceiver') {
        executionInfo[e.name] = { value: e.value } as AddressEx
        return
      }
      executionInfo[e.name] = e.value
    })
    const isNativeTransfer = executionInfo.hydraExecution.data === '0x'
    let decoded
    if (!isNativeTransfer) {
      const data = executionInfo.hydraExecution.data.slice(0, 2) + executionInfo.hydraExecution.data.slice(10)
      decoded = decodeMethodWithParams(ERC20, 'transfer', data)
      const [name, symbol, decimals] = await Promise.all([
        dispatch(sendWithState(getERC20Name, { erc20Address: executionInfo.hydraExecution.to })),
        dispatch(sendWithState(getERC20Symbol, { erc20Address: executionInfo.hydraExecution.to })),
        dispatch(sendWithState(getERC20Decimals, { erc20Address: executionInfo.hydraExecution.to })),
      ])
      decoded.decimals = Number(decimals)
      decoded.name = name
      decoded.symbol = symbol
    }

    tli.transaction.executionInfo = executionInfo as MultisigExecutionInfo
    tli.transaction.txInfo = {} as Transfer
    tli.transaction.txInfo.type = 'Transfer'
    tli.transaction.txInfo.direction = TransferDirection.OUTGOING
    tli.transaction.txInfo.sender = { value: ownerApproved } as AddressEx
    tli.transaction.txInfo.recipient = { value: decoded ? decoded.to : executionInfo.hydraExecution.to } as AddressEx
    const transferInfo = {} as any
    transferInfo.value = decoded
      ? decoded.value.toString()
      : logExecutionParams.events.find((e) => e.name === 'value').value
    transferInfo.tokenAddress = !isNativeTransfer ? executionInfo.to : undefined
    transferInfo.decimals = decoded ? decoded.decimals : undefined
    transferInfo.tokenName = decoded ? decoded.name : undefined
    transferInfo.tokenSymbol = decoded ? decoded.symbol : undefined
    transferInfo.type =
      executionInfo.hydraExecution.data === '0x' ? TransactionTokenType.NATIVE_COIN : TransactionTokenType.ERC20
    tli.transaction.txInfo.transferInfo = transferInfo as Erc20Transfer | NativeCoinTransfer
  }

  return tli
}

export const addOwner = async (
  tli: Transaction,
  log: any,
  safeAddress: string,
  dispatch: Dispatch,
): Promise<Transaction> => {
  const threshold = log.events.find((e) => e.name === '_threshold')?.value
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as AddOwner
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.ADD_OWNER
  tli.transaction.txInfo.settingsInfo.owner = (tli.transaction.txInfo.settingsInfo.owner ?? {}) as AddressEx
  tli.transaction.txInfo.settingsInfo.owner.value = log.events.find((e) => e.name === 'owner').value
  tli.transaction.txInfo.settingsInfo.threshold =
    threshold ?? (await dispatch(sendWithState(getGnosisProxyThreshold, { safeAddress })))
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

export const removeOwner = (tli: Transaction, logs: any): Transaction => {
  const threshold = logs.find((e) => e.name === 'ChangedThreshold')?.events?.[0].value
  const owner = logs.find((e) => e.name === 'RemovedOwner')?.events?.[0].value
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as RemoveOwner
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.REMOVE_OWNER
  tli.transaction.txInfo.settingsInfo.owner = (tli.transaction.txInfo.settingsInfo.owner ?? {}) as AddressEx
  tli.transaction.txInfo.settingsInfo.owner.value = owner
  tli.transaction.txInfo.settingsInfo.threshold = threshold
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'removeOwner'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  tli.transaction.txInfo.dataDecoded.parameters = logs.events
  return tli
}

export const changeThreshold = (tli: Transaction, logs: any): Transaction => {
  const threshold = logs.find((e) => e.name === 'ChangedThreshold')?.events?.[0].value
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as ChangeThreshold
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.CHANGE_THRESHOLD
  tli.transaction.txInfo.settingsInfo.threshold = threshold
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'changeThreshold'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  tli.transaction.txInfo.dataDecoded.parameters = logs.events
  return tli
}

export const addOracle = (tli: Transaction, log: any, safeAddress: string): Transaction => {
  if (safeAddress) {
  }
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as AddOwner
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.ADD_OWNER
  tli.transaction.txInfo.settingsInfo.owner = (tli.transaction.txInfo.settingsInfo.owner ?? {}) as AddressEx
  tli.transaction.txInfo.settingsInfo.owner.value = log.events.find((e) => e.name === 'oracle').value
  tli.transaction.txInfo.settingsInfo.threshold = 0
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'setOracle'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  tli.transaction.txInfo.dataDecoded.parameters = log.events
  return tli
}

export const transfer = (t: any, tli: Transaction, log: any, safeAddress: string): Transaction => {
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Transfer
  tli.transaction.txInfo.type = 'Transfer'
  const sender = log.events.find((e) => e.name === 'from').value
  tli.transaction.txInfo.sender = { value: sender } as AddressEx
  tli.transaction.txInfo.recipient = { value: log.events.find((e) => e.name === 'to').value } as AddressEx
  tli.transaction.txInfo.direction =
    sender.substring(2) === safeAddress ? TransferDirection.OUTGOING : TransferDirection.INCOMING
  tli.transaction.txInfo.transferInfo = (tli.transaction.txInfo.transferInfo ?? {}) as Erc20Transfer
  const token = t.qrc20TokenTransfers[0]
  tli.transaction.txInfo.transferInfo.decimals = token.decimals
  tli.transaction.txInfo.transferInfo.tokenAddress = '0x' + token.addressHex
  tli.transaction.txInfo.transferInfo.tokenName = token.name
  tli.transaction.txInfo.transferInfo.tokenSymbol = token.symbol
  tli.transaction.txInfo.transferInfo.value = log.events.find((e) => e.name === 'value').value
  tli.transaction.txInfo.transferInfo.logoUri = ''
  tli.transaction.txInfo.transferInfo.type = TransactionTokenType.ERC20
  return tli
}

export const transferHydra = (
  t: any,
  safeAddress: string,
  safeAddrHydra: string,
  receipt: any,
  logsDecoded: any,
  isConfimations: boolean,
): Transaction | undefined => {
  if (isConfimations && t.confirmations === 0) return

  const isReceiveHydra =
    receipt.logs?.length === 0 &&
    t.contractSpends?.length > 0 &&
    receipt.excepted === 'None' &&
    !t.qrc20TokenTransfers &&
    receipt.contractAddress === safeAddrHydra

  const isSentHydra =
    t.contractSpends?.length > 0 &&
    receipt.logs.length === 1 &&
    logsDecoded[0].name === 'ExecutionSuccess' &&
    receipt.excepted === 'None' &&
    !t.qrc20TokenTransfers
  if (!isSentHydra && !isReceiveHydra) return

  const tli = {} as Transaction
  tli.conflictType = 'None'
  tli.type = 'TRANSACTION'
  tli.transaction = {} as TransactionSummary
  tli.transaction.id = (isReceiveHydra ? 'hydra' : 'multisig') + '_0x' + safeAddress + '_0x' + t.id
  tli.transaction.timestamp = t.timestamp * 1000
  tli.transaction.txStatus = TransactionStatus.SUCCESS
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Transfer
  tli.transaction.txInfo.type = 'Transfer'
  tli.transaction.txInfo.sender = {
    value: hydraToHexAddress(isSentHydra ? safeAddrHydra : t.outputs.find((o) => o.address !== safeAddrHydra).address),
  } as AddressEx
  tli.transaction.txInfo.recipient = {
    value: hydraToHexAddress(
      isReceiveHydra ? safeAddrHydra : t.outputs.find((o) => o.address !== safeAddrHydra).address,
    ),
  } as AddressEx
  tli.transaction.txInfo.direction = isReceiveHydra ? TransferDirection.INCOMING : TransferDirection.OUTGOING
  tli.transaction.txInfo.transferInfo = (tli.transaction.txInfo.transferInfo ?? {
    type: TransactionTokenType.NATIVE_COIN,
    value: isReceiveHydra
      ? t.outputs.find((o) => o.address === safeAddrHydra).value
      : t.contractSpends[0].outputs.find((o) => o.addressHex !== safeAddress).value,
  }) as Erc20Transfer
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
