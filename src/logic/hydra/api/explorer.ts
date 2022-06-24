import { TokenType } from '@gnosis.pm/safe-apps-sdk'
import {
  AddressEx,
  SafeBalanceResponse,
  Transaction,
  TransactionData,
  TransactionDetails,
  TransactionListPage,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { ZERO_ADDRESS } from 'src/logic/wallets/ethAddresses'
import { Log } from 'web3-core'
import { addOwner, creation, transfer } from '../transformTransaction'
import {
  getItemEmpty,
  getSafeLogs,
  getTransactionItemList,
  getTransactionListPageEmpty,
  hydraFromHexAddress,
} from '../utils'

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
    const url = API_BASE + 'contract/' + address
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
  const [info, hydraInfo] = await Promise.all([fetchAddressInfo(hydraFromHexAddress(address)), fetchHydraPrice()])
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

export async function fetchContractTransactions(
  address: string,
  hydraSdk: any,
  userAddress: string,
): Promise<TransactionListPage> {
  try {
    const resp = await (await fetch(API_BASE + 'contract/' + address + '/txs')).json()
    const transactions = await fetchTransactions(resp.transactions)
    console.log('-------respt', transactions)

    const tlp = getTransactionListPageEmpty()
    tlp.next = ''
    tlp.previous = ''
    transactions.forEach(async (t: any, i: number) => {
      if (i === transactions.length - 1) {
        const _tli = await getTransactionItemList(t, (tli: Transaction, receipt: any) => {
          return creation(t, tli, receipt)
        })
        if (_tli) tlp.results.push(_tli)
      }
      const _tli = await getTransactionItemList(t, async (tli: Transaction, receipt: any) => {
        const logs = getSafeLogs(receipt.logs as Log[])
        if (logs?.length <= 0) return null
        logs.forEach(async (log: any) => {
          // tli.transaction.txInfo = {} as TransactionInfo
          switch (log.name) {
            case 'Transfer':
              tli = transfer(t, tli, log, address, receipt)
              break
            case 'AddedOwner':
              tli = await addOwner(tli, log, hydraSdk, address, userAddress)
              break
          }
        })
        return tli
      })
      if (_tli?.transaction.txInfo) tlp.results.push(_tli)
    })

    // const txlog = await hydraSdk.getTransactionReceipt(transactions[0].id)
    // console.log('--------------------- txLOG', txlog);
    return tlp
  } catch (e) {
    throw e
  }
}

export const fetchSafeTransactionDetails = async (
  transactionId: string,
  transaction: any,
): Promise<TransactionDetails> => {
  const td = {} as TransactionDetails
  if (!transaction) return td
  const txHash = transactionId.split('_')[2]
  const tx = await fetchTransaction(txHash.substring(2))
  switch (transaction.txInfo.type) {
    case 'SettingsChange':
      td.txId = transactionId
      td.executedAt = transaction.timestamp
      td.txStatus = transaction.txStatus
      td.txInfo = transaction.txInfo
      td.txHash = txHash
      td.txData = {} as TransactionData
      td.txData.hexData = tx.outputs
        .map((output) => {
          if (!output.receipt) return undefined
          return '0x' + output.scriptPubKey.hex
        })
        .filter((o) => o)[0]
      td.txData.dataDecoded = transaction.txInfo.dataDecoded
      td.txData.to = {} as AddressEx
      td.txData.to.value = tx.outputs
        .map((output) => {
          if (!output.receipt) return undefined
          return '0x' + output.addressHex
        })
        .filter((o) => o)[0]
      break
    default:
      throw new Error('No case')
  }

  return td
}
