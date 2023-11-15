import { DetailedExecutionInfo, TokenType } from '@gnosis.pm/safe-apps-sdk'
import {
  AddressEx,
  SafeBalanceResponse,
  Transaction,
  TransactionData,
  TransactionDetails,
  TransactionListPage,
  TransactionStatus,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { Dispatch } from 'src/logic/safe/store/actions/types'
import { ZERO_ADDRESS } from 'src/logic/wallets/ethAddresses'
import { Log } from 'web3-core'
import {
  addOwner,
  creation,
  getTransactionItemList,
  approvedHash,
  removeOwner,
  transfer,
  transferHydra,
  changeThreshold,
  executionCustom,
} from '../transformTransaction'
import { decodeMethod, getItemEmpty, getSafeLogs, getTransactionListPageEmpty } from '../utils'
import { SAFE_PROXY_FACTORY_ADDRESS } from '../contracts'

export const API_BASE = 'https://explorer.hydrachain.org/api/'

export const setLocalStorageLatestTxCountChecked = (value) => {
  localStorage.setItem('latestTxCountChecked', JSON.stringify(value))
}

export const getLocalStorageLatestTxCountChecked = () => {
  const latestTxCountChecked = localStorage.getItem('latestTxCountChecked')
  return latestTxCountChecked ? JSON.parse(latestTxCountChecked) : {}
}

export const setLocalStorageApprovedTransactionSchema = (value) => {
  localStorage.setItem('approvedTransactionSchema', JSON.stringify(value))
}

export const getLocalStorageApprovedTransactionSchema = () => {
  const approvedTransactionSchema = localStorage.getItem('approvedTransactionSchema')
  return approvedTransactionSchema ? JSON.parse(approvedTransactionSchema) : {}
}

export async function fetchGeneralInfo(): Promise<any> {
  try {
    const resp = await fetch(API_BASE + 'info')
    return await resp.json()
  } catch (e) {
    throw e
  }
}

export async function fetchBlock(hashOrNumber: string | number): Promise<any> {
  try {
    const resp = await fetch(API_BASE + 'block/' + hashOrNumber)
    return await resp.json()
  } catch (e) {
    throw e
  }
}

export async function fetchTransaction(hash: string): Promise<any> {
  try {
    const resp = await fetch(API_BASE + 'tx/' + hash)
    return await resp.json()
  } catch (e) {
    throw e
  }
}

async function _fetchTransactions(hashes: string[]): Promise<any> {
  if (hashes.length <= 0) return
  try {
    let url = API_BASE + 'txs/'
    hashes.forEach((hash, i, arr) => (url += hash + (i !== arr.length - 1 ? ',' : '')))
    return await (await fetch(url)).json()
  } catch (e) {
    throw e
  }
}

const LIMIT_TXs = 30

function isOverLimit(hashes: Array<string>): boolean {
  return hashes?.length > LIMIT_TXs
}

export async function fetchTransactions(hashes: Array<string>) {
  const promises: any[] = []
  if (!isOverLimit(hashes)) {
    return await _fetchTransactions(hashes)
  }

  while (hashes.length > 0) {
    promises.push(_fetchTransactions(hashes.splice(0, LIMIT_TXs)))
  }
  const result = (await Promise.all(promises)).flat()
  return result
}

export async function fetchAddressInfo(address: string): Promise<any> {
  try {
    const url = API_BASE + 'address/' + address
    return await (await fetch(url)).json()
  } catch (e) {
    throw e
  }
}

export async function fetchContractInfo(address: string): Promise<any> {
  try {
    if (address.length === 42) {
      address = address.substring(address.length - 40)
    }
    const url = API_BASE + 'contract/' + address
    const result = await (await fetch(url)).json()
    return result
  } catch (e) {
    throw e
  }
}

export async function fetchContractTxHashes(address: string, params?: string): Promise<any> {
  try {
    if (address.length === 42) {
      address = address.substring(address.length - 40)
    }
    const url = API_BASE + 'contract/' + address + '/txs' + (params ? `?${params}` : '')
    return await (await fetch(url)).json()
  } catch (e) {
    throw e
  }
}

// https://api.coingecko.com/api/v3/coins/hydra
export async function fetchHydraPrice(): Promise<any> {
  try {
    const info = (await fetch('https://api.coingecko.com/api/v3/coins/hydra')).json()
    return info
  } catch (e) {
    throw e
  }
}

const GQL_TOKEN_INFO = (addresses: string[]) => `
  query tokens {  
    tokens(where: { id_in: ${JSON.stringify(addresses)} }) {    
      id  
      derivedHYDRA   
    }
  }
`

const fetchTokenInfo = async (addresses: string[]) => {
  const data = await (
    await fetch('https://info.hydradex.org/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GQL_TOKEN_INFO(addresses) }),
    })
  ).json()
  return data
}

export async function fetchBalances(address: string): Promise<SafeBalanceResponse> {
  const [info, hydraInfo] = await Promise.all([fetchContractInfo(address), fetchHydraPrice()])
  const priceUsd = Number(hydraInfo?.market_data?.current_price?.usd)
  const balances = {} as SafeBalanceResponse
  balances.items = []
  const addresses = [] as string[]
  for (let i = -1; i < info?.qrc20Balances.length; i++) {
    // create HYDRA info
    const item = getItemEmpty()
    if (i < 0) {
      item.balance = info.balance ?? ''
      item.fiatBalance = (info.balance / 1e8) * priceUsd + ''
      balances.fiatTotal = item.fiatBalance
      item.fiatConversion = priceUsd + ''
      item.tokenInfo.type = 'NATIVE_TOKEN' as TokenType
      item.tokenInfo.address = ZERO_ADDRESS
      item.tokenInfo.decimals = 8
      item.tokenInfo.symbol = 'HYDRA'
      item.tokenInfo.name = 'Hydra'
      item.tokenInfo.logoUri = ''
    } else {
      const token = info.qrc20Balances[i]
      addresses.push(token.addressHex)
      item.balance = token.balance
      item.fiatBalance = ''
      item.fiatConversion = ''
      item.tokenInfo.type = 'ERC20' as TokenType
      item.tokenInfo.address = '0x' + token.addressHex
      item.tokenInfo.decimals = token.decimals
      item.tokenInfo.symbol = token.symbol
      item.tokenInfo.name = token.name
      item.tokenInfo.logoUri = ''
    }
    balances.items.push(item)
  }
  const data = await fetchTokenInfo(addresses)
  data.data.tokens?.forEach((token: { id: string; derivedHYDRA: string }) => {
    balances.items.forEach((item) => {
      if (item.tokenInfo.address.substring(2) === token.id) {
        item.fiatConversion = Number(token.derivedHYDRA) * priceUsd + ''
        item.fiatBalance = Number(item.fiatConversion) * (Number(item.balance) / 10 ** item.tokenInfo.decimals) + ''
        balances.fiatTotal = +balances.fiatTotal + +item.fiatBalance + ''
      }
    })
  })
  return balances
}

export async function fetchContractTransactions(address: string, dispatch: Dispatch): Promise<TransactionListPage> {
  try {
    const [safeInf, facInfo] = await Promise.all([
      fetchContractInfo(address),
      fetchContractInfo(SAFE_PROXY_FACTORY_ADDRESS),
    ])
    const totalSafeTxsCount = safeInf.transactionCount
    const totalFactoryTxsCount = facInfo.transactionCount
    const safeAddressHydra = safeInf.address
    const safeAddressHex = safeInf.addressHex
    const fullTxStorage = getLocalStorageLatestTxCountChecked()
    const addressTxStorage = fullTxStorage[safeAddressHex] ?? {}

    let page = 0
    const safeBatchTxsPromises: any[] = []
    const factoryBatchTxsPromises: any[] = []

    const tlp = getTransactionListPageEmpty()
    tlp.next = ''
    tlp.previous = ''
    // scan factory
    let isInCreation = false
    if (!addressTxStorage?.isCreationFound) {
      isInCreation = true
      let txCopy = totalFactoryTxsCount
      while (txCopy > 0) {
        txCopy -= 1000
        factoryBatchTxsPromises.push(fetchContractTxHashes(SAFE_PROXY_FACTORY_ADDRESS, `page=${page}&pageSize=1000`))
        page++
      }
      page = 0
      const factoryTxsHashes = (await Promise.all(factoryBatchTxsPromises)).map((r) => r.transactions).flat()
      const txsFactory = ([] = await fetchTransactions(factoryTxsHashes))
      let isCreationFound = false
      for (const t of txsFactory) {
        if (isCreationFound) break
        await getTransactionItemList(t, (tli: Transaction, receipt: any) => {
          const logs = getSafeLogs(receipt.logs as Log[])
          logs.forEach((l) => {
            if (l.name === 'ProxyCreation') {
              l.events.forEach((e) => {
                if (e.value === '0x' + safeAddressHex) {
                  tli = creation(t, tli, receipt)
                  isCreationFound = true
                  addressTxStorage.createTLI = tli
                  addressTxStorage.factory = totalFactoryTxsCount
                  addressTxStorage.isCreationFound = isCreationFound
                  fullTxStorage[safeAddressHex] = addressTxStorage
                  setLocalStorageLatestTxCountChecked(fullTxStorage)
                }
              })
            }
          })
          return tli
        })
      }
    }

    // scan safe
    if (
      !addressTxStorage?.safeHistory ||
      addressTxStorage?.safeHistory !== addressTxStorage?.safeQuued ||
      addressTxStorage?.safeHistory !== totalSafeTxsCount ||
      addressTxStorage?.safeQuued !== totalSafeTxsCount ||
      addressTxStorage?.safeLastQueedTLP?.results?.length > 0
      // true
    ) {
      let txCopy = totalSafeTxsCount
      while (txCopy > 0) {
        txCopy -= 1000
        safeBatchTxsPromises.push(fetchContractTxHashes(safeAddressHex, `page=${page}&pageSize=1000`))
        page++
      }
      const safeTxHashes = (await Promise.all(safeBatchTxsPromises)).map((r) => r.transactions).flat()
      page = 0

      const txs = ([] = await fetchTransactions(safeTxHashes))

      for (const t of txs) {
        await getTransactionItemList(t, async (tli: Transaction, receipt: any, index: number, input: any) => {
          const logs = getSafeLogs((receipt?.logs as Log[]) ?? [])
          const ht = transferHydra(t, safeAddressHex, safeAddressHydra, receipt, logs, true, input)
          if (ht) {
            tlp.results.push(ht)
            return null
          }
          for (const log of logs) {
            let executionParams
            let dataDecoded
            switch (log.name) {
              case 'ExecutionSuccess':
                executionParams = logs.find((l) => l.name === 'ExecutionParams')
                dataDecoded = decodeMethod(executionParams?.events?.find((p) => p.name === 'data')?.value ?? '0x')
                tli.transaction.txStatus = TransactionStatus.SUCCESS
                switch (dataDecoded?.name) {
                  case 'transfer':
                    tli = transfer(t, tli, dataDecoded, safeAddressHex)
                    break
                  case 'addOwnerWithThreshold':
                    tli = await addOwner(tli, safeAddressHex, dispatch, logs, dataDecoded.params)
                    break
                  case 'removeOwner':
                    tli = removeOwner(tli, logs, dataDecoded.params)
                    break
                  case 'changeThreshold':
                    tli = await changeThreshold(tli, safeAddressHex, dispatch, logs)
                    break
                  default:
                    tli = executionCustom(tli, logs)
                    break
                }
                if (tli?.transaction?.txInfo) tlp.results.push(tli)
                break
              case 'ExecutionFailure':
                executionParams = logs.find((l) => l.name === 'ExecutionParams')
                dataDecoded = decodeMethod(executionParams?.events?.find((p) => p.name === 'data')?.value ?? '0x')
                tli.transaction.txStatus = TransactionStatus.FAILED
                switch (dataDecoded?.name) {
                  case 'transfer':
                    tli = transfer(t, tli, dataDecoded, safeAddressHex)
                    break
                  case 'addOwnerWithThreshold':
                    tli = await addOwner(tli, safeAddressHex, dispatch, logs, dataDecoded.params)
                    break
                  case 'removeOwner':
                    tli = removeOwner(tli, logs, dataDecoded.params)
                    break
                  case 'changeThreshold':
                    tli = await changeThreshold(tli, safeAddressHex, dispatch, logs)
                    break
                  default:
                    tli = executionCustom(tli, logs)
                    break
                }
                if (tli?.transaction?.txInfo) tlp.results.push(tli)
                break
            }
          }
          // return tli
        })
      }

      if (tlp.results.length > 0 || isInCreation) {
        tlp.results.unshift(addressTxStorage?.createTLI)
        addressTxStorage.safeHistory = totalSafeTxsCount
        addressTxStorage.safeLastHistoryTLP = tlp
        fullTxStorage[safeAddressHex] = addressTxStorage
        setLocalStorageLatestTxCountChecked(fullTxStorage)
      }
    }

    return tlp.results.length > 0 ? tlp : addressTxStorage?.safeLastHistoryTLP
  } catch (e) {
    throw e
  }
}

export const fetchQueedTransactionsHydra = async (address: string, dispatch: Dispatch) => {
  const safeInf = await fetchContractInfo(address)
  const safeAddressHex = safeInf.addressHex
  const totalSafeTxsCount = safeInf.transactionCount
  let page = 0
  const safeBatchTxsPromises: any[] = []
  const tlp = getTransactionListPageEmpty()
  tlp.next = ''
  tlp.previous = ''
  let txCopy = totalSafeTxsCount
  while (txCopy > 0) {
    txCopy -= 1000
    safeBatchTxsPromises.push(fetchContractTxHashes(safeAddressHex, `page=${page}&pageSize=1000`))
    page++
  }
  const safeTxHashes = (await Promise.all(safeBatchTxsPromises)).map((r) => r.transactions).flat()
  const txs = await fetchTransactions(safeTxHashes)
  for (let i = txs?.length - 1; i >= 0; i--) {
    const t = txs[i]
    const _tli = await approvedHash(safeAddressHex, t, dispatch)
    if (_tli.transaction) {
      const safeTxHash = (_tli as any).transaction.executionInfo.safeTxHash
      const txHash = _tli.transaction.id.split('_')[2]
      const approvedTransactionSchema = getLocalStorageApprovedTransactionSchema()
      if (!approvedTransactionSchema[safeTxHash]) {
        approvedTransactionSchema[safeTxHash] = {}
      }
      approvedTransactionSchema[safeTxHash][txHash] = 1
      setLocalStorageApprovedTransactionSchema(approvedTransactionSchema)
      if (
        !tlp.results.find((__tli: any) => {
          return __tli.transaction.executionInfo.safeTxHash === (_tli as any).transaction.executionInfo.safeTxHash
        })
      ) {
        tlp.results.push(_tli)
      }
    }
  }
  const fullTxStorage = getLocalStorageLatestTxCountChecked()

  const addressTxStorage = fullTxStorage[safeAddressHex] ?? {}
  addressTxStorage.safeQuued = totalSafeTxsCount
  addressTxStorage.safeLastQueedTLP = tlp
  fullTxStorage[safeAddressHex] = addressTxStorage
  setLocalStorageLatestTxCountChecked(fullTxStorage)
  return addressTxStorage.safeLastQueedTLP
}

export const fetchSafeTransactionDetails = async (
  transactionId: string,
  dispatch: Dispatch,
  safeAddress: string,
): Promise<TransactionDetails | undefined> => {
  const txHash = transactionId.split('_')[2]
  const [tx, info] = await Promise.all([fetchTransaction(txHash.substring(2)), fetchContractInfo(safeAddress)])

  const safeAddressHydra = info.address
  const safeAddressHex = info.addressHex
  const _tli = await getTransactionItemList(tx, async (tli: Transaction, receipt: any, index: number, input: any) => {
    const _tx = Object.assign({}, tx)
    const _receipt = Object.assign({}, receipt)
    const logs = getSafeLogs((receipt?.logs as Log[]) ?? [])
    const ht = transferHydra(_tx, safeAddressHex, safeAddressHydra, _receipt, logs, true, input)
    if (ht) return ht
    for (const log of logs) {
      let executionParams
      let dataDecoded
      switch (log.name) {
        case 'ExecutionSuccess':
          executionParams = logs.find((l) => l.name === 'ExecutionParams')
          dataDecoded = decodeMethod(executionParams?.events?.find((p) => p.name === 'data')?.value ?? '0x')
          tli.transaction.txStatus = TransactionStatus.SUCCESS
          switch (dataDecoded?.name) {
            case 'transfer':
              tli = transfer(_tx, tli, dataDecoded, safeAddressHex)
              break
            case 'addOwnerWithThreshold':
              tli = await addOwner(tli, safeAddressHex, dispatch, logs, dataDecoded.params)
              break
            case 'removeOwner':
              tli = removeOwner(tli, logs, dataDecoded.params)
              break
            case 'changeThreshold':
              tli = await changeThreshold(tli, safeAddress, dispatch, logs, dataDecoded.params)
              break
            default:
              tli = executionCustom(tli, logs)
              break
          }
          break
        case 'ApproveHash':
          tli = await approvedHash(safeAddressHex, _tx, dispatch)
          break
        case 'ExecutionFailure':
          executionParams = logs.find((l) => l.name === 'ExecutionParams')
          dataDecoded = decodeMethod(executionParams?.events?.find((p) => p.name === 'data')?.value ?? '0x')
          tli.transaction.txStatus = TransactionStatus.FAILED
          switch (dataDecoded?.name) {
            case 'transfer':
              tli = transfer(_tx, tli, dataDecoded, safeAddressHex)
              break
            case 'addOwnerWithThreshold':
              tli = await addOwner(tli, safeAddressHex, dispatch, logs, dataDecoded.params)
              break
            case 'removeOwner':
              tli = removeOwner(tli, logs, dataDecoded.params)
              break
            case 'changeThreshold':
              tli = await changeThreshold(tli, safeAddressHex, dispatch, logs, dataDecoded.params)
              break
            default:
              tli = executionCustom(tli, logs)
              break
          }
          break
      }
    }
    return tli
  })
  const _transactionDetails = {} as TransactionDetails
  if (!_tli?.transaction?.txInfo) return undefined
  _transactionDetails.txId = transactionId
  _transactionDetails.txStatus = _tli.transaction.txStatus
  _transactionDetails.txInfo = _tli.transaction.txInfo
  _transactionDetails.detailedExecutionInfo = _tli.transaction.executionInfo as unknown as DetailedExecutionInfo
  _transactionDetails.txHash = txHash
  _transactionDetails.txData = {} as TransactionData
  _transactionDetails.txData.to = {
    value: (_tli?.transaction?.executionInfo as any)?.hydraExecution?.to ?? 'unknown',
  } as AddressEx
  _transactionDetails.txData.value = (_tli?.transaction?.executionInfo as any)?.hydraExecution?.value ?? ''
  _transactionDetails.executedAt = tx.timestamp * 1000
  _transactionDetails.txData.hexData = (_tli?.transaction?.executionInfo as any)?.hydraExecution?.data

  console.log('_transactionDetails', _transactionDetails)

  return _transactionDetails
}
