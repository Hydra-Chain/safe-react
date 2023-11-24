import { NativeCoinTransfer } from '@gnosis.pm/safe-apps-sdk'
import {
  AddOwner,
  AddressEx,
  ChangeThreshold,
  Creation,
  Custom,
  DataDecoded,
  Erc20Transfer,
  ExecutionInfo,
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
import {
  fetchContractInfo,
  getLocalStorageApprovedTransactionSchema,
  setLocalStorageApprovedTransactionSchema,
} from './api/explorer'
import {
  getGnosisProxyOwners,
  getGnosisProxyThreshold,
  sendWithState,
  getGnosisProxyApprovedHash,
  getGnosisProxyNonce,
  decodeMethodWithParams,
  // getGnosisProxyOracle,
} from './contractInteractions/utils'
import { DEPOSIT_TO_SAFE_CONTRACT_ADDRESS, SAFE_PROXY_FACTORY_ADDRESS, SAFE_SINGLETON_ADDRESS } from './contracts'
import { decodeMethod, getSafeLogs, hydraToHexAddress, isHashConsumed } from './utils'

export const getTransactionItemList = async (transaction: any, callback: any): Promise<Transaction | null> => {
  let tli: Transaction | null = null
  for (let i = 0; i < transaction.inputs.length; i++) {
    const input = transaction.inputs[i]
    if (input.addressHex !== DEPOSIT_TO_SAFE_CONTRACT_ADDRESS) continue
    tli = {} as Transaction
    tli.conflictType = 'None'
    tli.type = 'TRANSACTION'
    tli.transaction = {} as TransactionSummary
    tli.transaction.id = 'multisig_' + '0x' + DEPOSIT_TO_SAFE_CONTRACT_ADDRESS + '_0x' + transaction.id
    tli.transaction.timestamp = transaction.timestamp * 1000
    tli = await callback(tli, undefined, i, input)
  }
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
    // tli.transaction.txStatus = receipt.excepted === 'None' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED
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

export const addOwner = async (tli: Transaction, params: any, nonce: any): Promise<Transaction> => {
  let threshold, owner
  for (const p of params) {
    if (p.name === '_threshold') threshold = p.value
    if (p.name === 'owner') owner = p.value
  }

  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as AddOwner
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.ADD_OWNER
  tli.transaction.txInfo.settingsInfo.owner = (tli.transaction.txInfo.settingsInfo.owner ?? {}) as AddressEx
  tli.transaction.txInfo.settingsInfo.owner.value = owner
  tli.transaction.txInfo.settingsInfo.threshold = Number(threshold)
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'addOwnerWithThreshold'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  tli.transaction.txInfo.dataDecoded.parameters = params
  const executionInfo = tli.transaction.executionInfo ?? {}
  executionInfo['nonce'] = nonce
  tli.transaction.executionInfo = executionInfo as ExecutionInfo
  return tli
}

export const removeOwner = (tli: Transaction, params: any, nonce: any): Transaction => {
  let owner, threshold
  for (const p of params) {
    if (p.name === 'owner') owner = p.value
    if (p.name === '_threshold') threshold = p.value
  }
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as RemoveOwner
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.REMOVE_OWNER
  tli.transaction.txInfo.settingsInfo.threshold = Number(threshold)
  tli.transaction.txInfo.settingsInfo.owner = (tli.transaction.txInfo.settingsInfo.owner ?? {}) as AddressEx
  tli.transaction.txInfo.settingsInfo.owner.value = owner
  const executionInfo = tli.transaction.executionInfo ?? {}
  executionInfo['nonce'] = nonce
  tli.transaction.executionInfo = executionInfo as ExecutionInfo
  tli.transaction.executionInfo
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'removeOwner'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  tli.transaction.txInfo.dataDecoded.parameters = params
  return tli
}

export const changeThreshold = async (
  tli: Transaction,
  logs?: any,
  params?: any,
  nonce?: any,
): Promise<Transaction> => {
  let threshold = 0
  if (logs) {
    for (const e of logs) {
      if (e.name === 'AddedOwner') return await addOwner(tli, params, nonce)
      if (e.name === 'RemovedOwner') return removeOwner(tli, params, nonce)
      if (e.name === 'ChangedThreshold') threshold = e.events[0].value
    }
  }
  threshold = threshold === 0 ? params.find((p) => p.name === '_threshold')?.value : threshold
  const executionInfo = tli.transaction.executionInfo ?? {}
  executionInfo['nonce'] = nonce
  tli.transaction.executionInfo = executionInfo as ExecutionInfo
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as ChangeThreshold
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.CHANGE_THRESHOLD
  tli.transaction.txInfo.settingsInfo.threshold = Number(threshold)
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'changeThreshold'
  tli.transaction.txInfo.dataDecoded.parameters = (tli.transaction.txInfo.dataDecoded.parameters ?? []) as Parameter[]
  tli.transaction.txInfo.dataDecoded.parameters = !params ? logs.events : params
  return tli
}

export const executionFailure = (tli: Transaction, logs: any): Transaction => {
  const executionParams = logs.find((e) => e.name === 'ExecutionParams')
  const to = executionParams?.events?.find((e) => e.name === 'to').value
  const nonce = executionParams?.events?.find((e) => e.name === '_nonce').value
  const payment = logs.find((l) => l.name === '"ExecutionFailure"')?.events?.find((e) => e.name === 'payment')?.value
  tli.transaction.txStatus = TransactionStatus.FAILED
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Custom
  tli.transaction.txInfo.type = 'Custom'
  tli.transaction.txInfo.methodName = 'ExecutionFailure'
  tli.transaction.txInfo.actionCount = 1
  tli.transaction.txInfo.to = (tli.transaction.txInfo.to ?? {}) as AddressEx
  tli.transaction.txInfo.to.value = to
  tli.transaction.txInfo.value = payment
  const executionInfo = { hydraExecution: { data: '' }, nonce: nonce } as any
  executionInfo.hydraExecution.data = executionParams?.events?.find((e) => e.name === 'data')?.value
  return tli
}

export const executionCustom = (tli: Transaction, logs: any): Transaction => {
  let data, to, value, nonce, payment
  for (const e of logs) {
    if (e.name === 'ExecutionParams') {
      e.events.forEach((e) => {
        if (e.name === 'data') data = e.value
        if (e.name === 'to') to = e.value
        if (e.name === 'value') value = e.value
        if (e.name === '_nonce') nonce = e.value
      })
    }
    if (e.name === 'ExecutionSuccess') {
      payment = e.events.find((e) => e.name === 'payment').value
    }
  }
  const executionInfo = {
    hydraExecution: {
      data,
      to,
      value,
      nonce,
    },
    nonce,
  } as any

  tli.transaction.executionInfo = executionInfo as ExecutionInfo
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Custom
  tli.transaction.txInfo.type = 'Custom'
  tli.transaction.txInfo.methodName = 'Custom'
  tli.transaction.txInfo.actionCount = 1
  tli.transaction.txInfo.to = (tli.transaction.txInfo.to ?? {}) as AddressEx
  tli.transaction.txInfo.to.value = to
  tli.transaction.txInfo.value = payment
  return tli
}

export const executionRejection = (tli: Transaction, executionParams: any, actionCount: 0 | null): Transaction => {
  const eventsMap = {}
  executionParams?.events?.forEach((e) => {
    eventsMap[e.name] = e
  })
  const to = eventsMap['to']?.value
  const nonce = eventsMap['_nonce']?.value
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Custom
  tli.transaction.txInfo.type = 'Custom'
  tli.transaction.txInfo.actionCount = actionCount ?? null
  tli.transaction.txInfo.dataSize = '0'
  tli.transaction.txInfo.isCancellation = true
  tli.transaction.txInfo.to = (tli.transaction.txInfo.to ?? {}) as AddressEx
  tli.transaction.txInfo.to.value = to
  tli.transaction.txInfo.value = '0'
  tli.transaction.executionInfo = { type: 'MULTISIG', nonce: nonce } as ExecutionInfo
  return tli
}

export const changeThresholdPercentage = (tli: Transaction, logs: any): Transaction => {
  const thresholdPercentage = logs.find((e) => e.name === 'ThresholdPercentageChanged')?.events?.[2].value
  if (!thresholdPercentage) return tli
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as SettingsChange
  tli.transaction.txInfo.type = 'SettingsChange'
  tli.transaction.txInfo.settingsInfo = (tli.transaction.txInfo.settingsInfo ?? {}) as ChangeThreshold
  tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.CHANGE_THRESHOLD
  tli.transaction.txInfo.settingsInfo.threshold = thresholdPercentage
  tli.transaction.txInfo.dataDecoded = (tli.transaction.txInfo.dataDecoded ?? {}) as DataDecoded
  tli.transaction.txInfo.dataDecoded.method = 'changeThresholdPercentage'
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

export const transfer = (
  t: any,
  tli: Transaction,
  params: any,
  safeAddress: string,
  executionParams: any,
): Transaction => {
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Transfer
  tli.transaction.txInfo.type = 'Transfer'
  let from, to, value
  const nonce = executionParams.events.find((e) => e.name === '_nonce').value
  params.params.forEach((e) => {
    if (e.name === 'from') from = e.value
    if (e.name === 'to') to = e.value
    if (e.name === 'value') value = e.value
  })
  if (!from) from = '0x' + safeAddress
  const executionInfo = tli.transaction.executionInfo ?? {}
  executionInfo['nonce'] = nonce
  tli.transaction.executionInfo = executionInfo as ExecutionInfo
  tli.transaction.txInfo.sender = { value: from } as AddressEx
  tli.transaction.txInfo.recipient = { value: to } as AddressEx
  tli.transaction.txInfo.direction =
    from.substring(2) === safeAddress ? TransferDirection.OUTGOING : TransferDirection.INCOMING
  tli.transaction.txInfo.transferInfo = (tli.transaction.txInfo.transferInfo ?? {}) as Erc20Transfer
  const token = t.qrc20TokenTransfers[0]
  tli.transaction.txInfo.transferInfo.decimals = token.decimals
  tli.transaction.txInfo.transferInfo.tokenAddress = '0x' + token.addressHex
  tli.transaction.txInfo.transferInfo.tokenName = token.name
  tli.transaction.txInfo.transferInfo.tokenSymbol = token.symbol
  tli.transaction.txInfo.transferInfo.value = value
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
  input: any,
): Transaction | undefined => {
  if (isConfimations && t.confirmations === 0) return

  const isReceiveHydra =
    input ||
    (receipt?.logs?.length === 0 &&
      t.contractSpends?.length > 0 &&
      receipt?.excepted === 'None' &&
      !t.qrc20TokenTransfers &&
      receipt?.contractAddress === safeAddrHydra)

  const isSentHydra =
    t.contractSpends?.length > 0 &&
    !logsDecoded[1]?.events?.find((e) => e.name === 'data')?.value &&
    logsDecoded[0]?.name === 'ExecutionSuccess' &&
    receipt?.excepted === 'None' &&
    !t.qrc20TokenTransfers

  if (!isSentHydra && !isReceiveHydra) return
  const nonce = logsDecoded.find((l) => l.name === 'ExecutionParams')?.events?.find((e) => e.name === '_nonce')?.value
  const tli = {} as Transaction
  tli.conflictType = 'None'
  tli.type = 'TRANSACTION'
  tli.transaction = {} as TransactionSummary
  tli.transaction.executionInfo = tli.transaction.executionInfo ?? ({} as ExecutionInfo)
  tli.transaction.executionInfo['nonce'] = nonce
  tli.transaction.timestamp = t.timestamp * 1000
  tli.transaction.id = (isReceiveHydra ? 'hydra' : 'multisig') + '_0x' + safeAddress + '_0x' + t.id
  tli.transaction.txStatus = TransactionStatus.SUCCESS
  tli.transaction.txInfo = (tli.transaction.txInfo ?? {}) as Transfer
  tli.transaction.txInfo.type = 'Transfer'
  tli.transaction.txInfo.sender = {
    value: hydraToHexAddress(isSentHydra ? safeAddrHydra : input ? DEPOSIT_TO_SAFE_CONTRACT_ADDRESS : receipt?.sender),
  } as AddressEx
  tli.transaction.txInfo.recipient = {
    value: hydraToHexAddress(isReceiveHydra ? safeAddrHydra : logsDecoded[1].events.find((e) => e.name === 'to').value),
  } as AddressEx
  tli.transaction.txInfo.direction = isReceiveHydra ? TransferDirection.INCOMING : TransferDirection.OUTGOING
  tli.transaction.txInfo.transferInfo = (tli.transaction.txInfo.transferInfo ?? {
    type: TransactionTokenType.NATIVE_COIN,
    value: isReceiveHydra
      ? input
        ? input.value
        : t.outputs.find((o) => o.address === safeAddrHydra).value
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

export const approvedHash = async (
  safeAddress: string,
  transaction: any,
  dispatch: Dispatch,
): Promise<{ tli: Transaction; _isHashConsumed: boolean }> => {
  let tli = {} as Transaction
  let _isHashConsumed
  for (const output of transaction.outputs) {
    const receipt = output.receipt
    if (!receipt) continue
    const logs = getSafeLogs(receipt.logs as Log[])
    const logApprovedHash = logs.find((log) => log.name === 'ApproveHash')
    if (!logApprovedHash) continue
    const logExecutionParams = logs.find((log) => log.name === 'ExecutionParams')
    _isHashConsumed = await isHashConsumed(safeAddress, logApprovedHash, dispatch)
    const safeTxHash = logApprovedHash.events.find((e) => e.name === 'approvedHash').value
    if (_isHashConsumed) {
      const approvedTransactionSchema = getLocalStorageApprovedTransactionSchema()
      if (approvedTransactionSchema[safeTxHash]) {
        delete approvedTransactionSchema[safeTxHash]
        setLocalStorageApprovedTransactionSchema(approvedTransactionSchema)
      }
      return { tli, _isHashConsumed }
      // continue
    }
    let confirmationsSubmitted = 1
    const [threshold, nonce, owners] = await Promise.all([
      dispatch(sendWithState(getGnosisProxyThreshold, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyNonce, { safeAddress })),
      dispatch(sendWithState(getGnosisProxyOwners, { safeAddress })),
    ])
    const _nonce = logExecutionParams.events.find((e) => e.name === '_nonce').value
    if (Number(nonce) > _nonce) continue

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
    const isNativeTransfer =
      (!executionInfo.hydraExecution.data || executionInfo.hydraExecution.data === '0x') &&
      executionInfo.hydraExecution.value !== '0'
    let decoded
    const data = logExecutionParams.events.find((e) => e.name === 'data').value
    const dataDecoded = decodeMethod(data ?? '0x')
    // const oracle = await dispatch(sendWithState(getGnosisProxyOracle, { safeAddress }))
    // const to = logExecutionParams.events.find((e) => e.name === 'to').value
    // console.log('to, oracle', to, oracle)
    switch (dataDecoded?.name) {
      case 'addOwnerWithThreshold':
        tli = await addOwner(tli, dataDecoded.params, _nonce)
        tli.transaction.executionInfo = {
          ...executionInfo,
          ...tli.transaction.executionInfo,
        } as MultisigExecutionInfo
        break
      case 'removeOwner':
        tli = removeOwner(tli, dataDecoded.params, _nonce)
        tli.transaction.executionInfo = {
          ...executionInfo,
          ...tli.transaction.executionInfo,
        } as MultisigExecutionInfo
        break
      case 'changeThreshold':
        tli = await changeThreshold(tli, logs, dataDecoded.params, _nonce)
        tli.transaction.executionInfo = {
          ...executionInfo,
          ...tli.transaction.executionInfo,
        } as MultisigExecutionInfo
        break
      case 'transfer':
        const data = executionInfo.hydraExecution.data.slice(0, 2) + executionInfo.hydraExecution.data.slice(10)
        decoded = decodeMethodWithParams(ERC20, 'transfer', data)
        const erc20Contract = await fetchContractInfo(executionInfo.hydraExecution.to)
        const { name, symbol, decimals } = erc20Contract
        decoded.decimals = decimals
        decoded.name = name
        decoded.symbol = symbol
        tli.transaction.executionInfo = executionInfo as MultisigExecutionInfo
        tli.transaction.txInfo = {} as Transfer
        tli.transaction.txInfo.type = 'Transfer'
        tli.transaction.txInfo.direction = TransferDirection.OUTGOING
        tli.transaction.txInfo.sender = { value: ownerApproved } as AddressEx
        tli.transaction.txInfo.recipient = {
          value: decoded ? decoded.to : executionInfo.hydraExecution.to,
        } as AddressEx
        const transferInfo = {} as any
        transferInfo.value = decoded
          ? decoded.value.toString()
          : logExecutionParams.events.find((e) => e.name === 'value').value
        transferInfo.tokenAddress = executionInfo.to
        transferInfo.decimals = decoded.decimals
        transferInfo.tokenName = decoded.name
        transferInfo.tokenSymbol = decoded.symbol
        transferInfo.type = TransactionTokenType.ERC20
        tli.transaction.txInfo.transferInfo = transferInfo as Erc20Transfer
        break
      default:
        if (isNativeTransfer) {
          tli.transaction.executionInfo = executionInfo as MultisigExecutionInfo
          tli.transaction.txInfo = {} as Transfer
          tli.transaction.txInfo.type = 'Transfer'
          tli.transaction.txInfo.direction = TransferDirection.OUTGOING
          tli.transaction.txInfo.sender = { value: ownerApproved } as AddressEx
          tli.transaction.txInfo.recipient = {
            value: decoded ? decoded.to : executionInfo.hydraExecution.to,
          } as AddressEx
          const transferInfo = {} as any
          transferInfo.value = logExecutionParams.events.find((e) => e.name === 'value').value
          transferInfo.type = TransactionTokenType.NATIVE_COIN
          tli.transaction.txInfo.transferInfo = transferInfo as NativeCoinTransfer
        } else {
          if (
            (!executionInfo.hydraExecution.data || executionInfo.hydraExecution.data === '0x') &&
            executionInfo.hydraExecution.value === '0'
          ) {
            // rejection tx
            tli = executionRejection(tli, logExecutionParams, 0)
            tli.transaction.executionInfo = {
              ...executionInfo,
              ...tli.transaction.executionInfo,
            } as MultisigExecutionInfo
          } else {
            tli = executionCustom(tli, logs)
            tli.transaction.executionInfo = {
              ...executionInfo,
              ...tli.transaction.executionInfo,
            } as MultisigExecutionInfo
          }
        }
        break
    }
    //   if ('0x' + oracle === to) {
    //     tli = await addOwner(tli, logs[0], safeAddress, dispatch)
    //     tli.transaction.executionInfo = executionInfo as MultisigExecutionInfo
    //     console.log('tli', tli)
    //   } else {
    //     if (!isNativeTransfer) {
    //       const data = executionInfo.hydraExecution.data.slice(0, 2) + executionInfo.hydraExecution.data.slice(10)
    //       decoded = decodeMethodWithParams(ERC20, 'transfer', data)
    //       const [name, symbol, decimals] = await Promise.all([
    //         dispatch(sendWithState(getERC20Name, { erc20Address: executionInfo.hydraExecution.to })),
    //         dispatch(sendWithState(getERC20Symbol, { erc20Address: executionInfo.hydraExecution.to })),
    //         dispatch(sendWithState(getERC20Decimals, { erc20Address: executionInfo.hydraExecution.to })),
    //       ])
    //       decoded.decimals = Number(decimals)
    //       decoded.name = name
    //       decoded.symbol = symbol

    //     }
    //     tli.transaction.executionInfo = executionInfo as MultisigExecutionInfo
    //     tli.transaction.txInfo = {} as Transfer
    //     tli.transaction.txInfo.type = 'Transfer'
    //     tli.transaction.txInfo.direction = TransferDirection.OUTGOING
    //     tli.transaction.txInfo.sender = { value: ownerApproved } as AddressEx
    //     tli.transaction.txInfo.recipient = { value: decoded ? decoded.to : executionInfo.hydraExecution.to } as AddressEx
    //     const transferInfo = {} as any
    //     transferInfo.value = decoded
    //       ? decoded.value.toString()
    //       : logExecutionParams.events.find((e) => e.name === 'value').value
    //     transferInfo.tokenAddress = !isNativeTransfer ? executionInfo.to : undefined
    //     transferInfo.decimals = decoded ? decoded.decimals : undefined
    //     transferInfo.tokenName = decoded ? decoded.name : undefined
    //     transferInfo.tokenSymbol = decoded ? decoded.symbol : undefined
    //     transferInfo.type =
    //       executionInfo.hydraExecution.data === '0x' ? TransactionTokenType.NATIVE_COIN : TransactionTokenType.ERC20
    //     tli.transaction.txInfo.transferInfo = transferInfo as Erc20Transfer | NativeCoinTransfer
    //   }
  }
  return { tli, _isHashConsumed }
}
