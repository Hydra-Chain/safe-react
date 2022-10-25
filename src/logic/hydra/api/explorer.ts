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
  // addOracle,
  addOwner,
  creation,
  getTransactionItemList,
  approvedHash,
  removeOwner,
  transfer,
  transferHydra,
  // changeThresholdPercentage,
  changeThreshold,
  executionFailure,
} from '../transformTransaction'
import { getItemEmpty, getSafeLogs, getTransactionListPageEmpty } from '../utils'
import { SAFE_PROXY_FACTORY_ADDRESS } from '../contracts'
// import { getGnosisProxyOracle, sendWithState } from '../contractInteractions/utils'

export const API_BASE = 'https://explorer.hydrachain.org/api/'

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

export async function fetchTransactions(hashes: string[]): Promise<any> {
  if (hashes.length <= 0) return
  try {
    let url = API_BASE + 'txs/'
    hashes.forEach((hash, i, arr) => (url += hash + (i !== arr.length - 1 ? ',' : '')))
    return await (await fetch(url)).json()
  } catch (e) {
    throw e
  }
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
    const [info, safeTxHashes, factoryTxs] = await Promise.all([
      fetchContractInfo(address),
      fetchContractTxHashes(address),
      fetchContractTxHashes(SAFE_PROXY_FACTORY_ADDRESS),
    ])

    const safeAddressHydra = info.address
    const safeAddressHex = info.addressHex
    const [txs = [], txsFactory = []] = await Promise.all([
      // dispatch(sendWithState(getGnosisProxyOracle, { safeAddress: safeAddressHex })),
      fetchTransactions(safeTxHashes.transactions),
      fetchTransactions(factoryTxs.transactions),
    ])

    // const oracleTxHashes = await fetchContractTxHashes(oracle)
    // const oracleTxs = await fetchTransactions(oracleTxHashes.transactions)
    const tlp = getTransactionListPageEmpty()
    tlp.next = ''
    tlp.previous = ''
    let isCreationFound = false
    for (const t of txsFactory) {
      if (isCreationFound) continue
      const _tli = await getTransactionItemList(t, (tli: Transaction, receipt: any) => {
        const logs = getSafeLogs(receipt.logs as Log[])
        logs.forEach((l) => {
          if (l.name === 'ProxyCreation') {
            l.events.forEach((e) => {
              if (e.value === '0x' + safeAddressHex) {
                tli = creation(t, tli, receipt)
                isCreationFound = true
              }
            })
          }
        })
        return tli
      })
      if (_tli?.transaction?.txInfo) tlp.results.push(_tli)
    }

    // for (const t of oracleTxs) {
    //   const _tli = await getTransactionItemList(t, (tli: Transaction, receipt: any) => {
    //     const logs = getSafeLogs(receipt.logs as Log[])
    //     return changeThresholdPercentage(tli, logs)
    //   })
    //   if (_tli?.transaction?.txInfo) tlp.results.push(_tli)
    // }

    for (const t of txs) {
      await getTransactionItemList(t, async (tli: Transaction, receipt: any) => {
        const logs = getSafeLogs(receipt.logs as Log[])
        // if (t.id === '868a96a3e0e063ca90d3ca416ddd7012a3339754bb7d63719b3aeb05aa6b4be1') {
        //   console.log('logs', logs)
        // }
        const ht = transferHydra(t, address, safeAddressHydra, receipt, logs, true)
        if (ht) {
          tlp.results.push(ht)
          return null
        }
        if (logs?.length <= 0) return null
        for (const log of logs) {
          // tli.transaction.txInfo = {} as TransactionInfo
          switch (log.name) {
            case 'Transfer':
              tli = transfer(t, tli, log, address)
              if (tli?.transaction?.txInfo) tlp.results.push(tli)
              break
            case 'AddedOwner':
              tli = await addOwner(tli, address, dispatch, log)
              if (tli?.transaction?.txInfo) tlp.results.push(tli)
              break
            // case 'AddedOracle':
            //   tli = addOracle(tli, log, address)
            //   if (tli?.transaction?.txInfo) tlp.results.push(tli)
            //   break
            case 'RemovedOwner':
              tli = removeOwner(tli, logs)
              if (tli?.transaction?.txInfo) tlp.results.push(tli)
              break
            case 'ChangedThreshold':
              tli = await changeThreshold(tli, address, dispatch, logs)
              if (tli?.transaction?.txInfo) tlp.results.push(tli)
              break
            case 'ExecutionFailure':
              tli = executionFailure(tli, logs)
              if (tli?.transaction?.txInfo) tlp.results.push(tli)
              break
          }
        }
        return tli
      })
    }
    return tlp
  } catch (e) {
    throw e
  }
}

export const setLocalStorageApprovedTransactionSchema = (value) => {
  localStorage.setItem('approvedTransactionSchema', JSON.stringify(value))
}

export const getLocalStorageApprovedTransactionSchema = () => {
  const approvedTransactionSchema = localStorage.getItem('approvedTransactionSchema')
  return approvedTransactionSchema ? JSON.parse(approvedTransactionSchema) : {}
}

export const fetchQueedTransactionsHydra = async (address: string, dispatch: Dispatch) => {
  const [respTxHashes] = await Promise.all([
    // fetchContractInfo(address),
    fetch(API_BASE + 'contract/' + (address.length === 42 ? address.substring(address.length - 40) : address) + '/txs'),
  ])
  // const safeAddressHydra = info.address
  const txs = await fetchTransactions((await respTxHashes.json()).transactions)
  const tlp = getTransactionListPageEmpty()
  tlp.next = ''
  tlp.previous = ''
  if (txs) {
    for (let i = txs.length - 1; i >= 0; i--) {
      const t = txs[i]
      if (t.id === 'e6720edb27fea7c47f3618daec33e067c06586520b0b290a8a4ce3d2a991c94d') {
        console.log('transaction', t)
      }
      const _tli = await approvedHash(address, t, dispatch)
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
  }
  return tlp
}

export const fetchSafeTransactionDetails = async (
  transactionId: string,
  dispatch: Dispatch,
  safeAddress: string,
): Promise<TransactionDetails | undefined> => {
  // await new Promise(r => setTimeout(r, 10000));
  const txHash = transactionId.split('_')[2]
  const [tx, info] = await Promise.all([fetchTransaction(txHash.substring(2)), fetchContractInfo(safeAddress)])

  const safeAddressHydra = info.address
  const _tli = await getTransactionItemList(tx, async (tli: Transaction, receipt: any) => {
    const _tx = Object.assign({}, tx)
    const _receipt = Object.assign({}, receipt)
    const logs = getSafeLogs(receipt.logs as Log[])
    const ht = transferHydra(_tx, safeAddress, safeAddressHydra, _receipt, logs, true)
    if (ht) return ht
    tli.transaction.txStatus === TransactionStatus.FAILED
    if (logs?.length <= 0) return null
    for (const log of logs) {
      // tli.transaction.txInfo = {} as TransactionInfo
      switch (log.name) {
        case 'Transfer':
          tli = transfer(_tx, tli, log, safeAddress)
          break
        case 'AddedOwner':
          tli = await addOwner(tli, safeAddress, dispatch, log)
          break
        // case 'AddedOracle':
        //   tli = addOracle(tli, log, safeAddress)
        //   break
        case 'RemovedOwner':
          tli = removeOwner(tli, logs)
          break
        case 'ChangedThreshold':
          tli = await changeThreshold(tli, safeAddress, dispatch, logs)
          break
        case 'ApproveHash':
          tli = await approvedHash(safeAddress, _tx, dispatch)
          break
        case 'ExecutionFailure':
          tli = await executionFailure(tli, logs)
          break
        // case 'ThresholdPercentageChanged':
        //   tli = changeThresholdPercentage(tli, logs)
        //   break
      }
    }
    return tli
  })
  const _transactionDetails = {} as TransactionDetails
  if (!_tli?.transaction?.txInfo) return undefined
  _transactionDetails.txId = transactionId

  // td.executedAt = tx.timestamp * 1000
  // td.txStatus = transaction?.txDetails?.txStatus ?? 'AWAITING_CONFIRMATIONS'
  _transactionDetails.txStatus = _tli.transaction.txStatus
  _transactionDetails.txInfo = _tli.transaction.txInfo
  _transactionDetails.detailedExecutionInfo = _tli.transaction.executionInfo as unknown as DetailedExecutionInfo
  _transactionDetails.txHash = txHash
  _transactionDetails.txData = {} as TransactionData
  _transactionDetails.txData.to = { value: 'unknown' } as AddressEx
  _transactionDetails.executedAt = tx.timestamp * 1000
  _transactionDetails.txData.hexData =
    (_tli?.transaction?.executionInfo as any)?.hydraExecution?.data ??
    tx?.outputs
      .map((output) => {
        if (!output.receipt) return undefined
        return '0x' + output.scriptPubKey.hex
      })
      .filter((o) => o)[0]

  return _transactionDetails
}
