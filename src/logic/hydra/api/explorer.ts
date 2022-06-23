import { Creation, Erc20Transfer, TokenType, Transfer, TransferInfo } from "@gnosis.pm/safe-apps-sdk"
import { AddOwner, AddressEx, DataDecoded, Parameter, SafeBalanceResponse, SettingsChange, SettingsInfo, SettingsInfoType, TokenInfo, Transaction, TransactionInfo, TransactionListItem, TransactionListPage, TransactionStatus, TransactionSummary, TransferDirection } from "@gnosis.pm/safe-react-gateway-sdk"
import { ZERO_ADDRESS } from "src/logic/wallets/ethAddresses"
import { Log } from "web3-core"
import { SAFE_PROXY_FACTORY_ADDRESS, SAFE_SINGLETON_ADDRESS } from "../contracts"
import { getItemEmpty, getSafeLogs, getTransactionListPageEmpty, hydraFromHexAddress, hydraToHexAddress } from "../utils"


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
        const info = (await fetch('https://api.coingecko.com/api/v3/coins/hydra')).json();
        return info;
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
  const data = await (await fetch( 'https://info.hydradex.org/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GQL_TOKEN_INFO(addresses) })
  })).json()
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
      item.fiatBalance = ((info.balance / 1e8) * priceUsd) + '' 
      balances.fiatTotal = item.fiatBalance
      item.fiatConversion = priceUsd+''
      item.tokenInfo.type = 'NATIVE_TOKEN' as TokenType
      item.tokenInfo.address = ZERO_ADDRESS
      item.tokenInfo.decimals = 8
      item.tokenInfo.symbol = 'HYDRA'
      item.tokenInfo.name = 'Hydra'
      item.tokenInfo.logoUri = ''
    } else {
      const token = info.qrc20Balances[i];
      addresses.push(token.addressHex)
      item.balance = token.balance
      item.fiatBalance = ''
      item.fiatConversion = ''
      item.tokenInfo.type = 'ERC20' as TokenType
      item.tokenInfo.address = '0x'+token.addressHex
      item.tokenInfo.decimals = token.decimals
      item.tokenInfo.symbol = token.symbol
      item.tokenInfo.name = token.name
      item.tokenInfo.logoUri = ''
    }
    balances.items.push(item)
  }
  const data = await fetchTokenInfo(addresses)
  data.data.tokens?.forEach((token: { id: string, derivedHYDRA: string }) => {
    balances.items.forEach(item => {
      if (item.tokenInfo.address.substring(2) === token.id) {
        item.fiatConversion = (Number(token.derivedHYDRA) * priceUsd)+''
        item.fiatBalance = (Number(item.fiatConversion) * (Number(item.balance) / (10 ** item.tokenInfo.decimals)))+''
        balances.fiatTotal = (+balances.fiatTotal + +item.fiatBalance)+''
      }
    })
  }) 
  return balances
} 

export async function fetchContractTransactions(address: string, hydraSdk: any): Promise<TransactionListPage> {
  try {
    const resp = await (await fetch(API_BASE + 'contract/' + address + '/txs')).json()
    const transactions = await fetchTransactions(resp.transactions)
    console.log('-------respt', transactions);
    
    const tlp = getTransactionListPageEmpty()
    tlp.next = ''
    tlp.previous = ''
    transactions.forEach((t,i) => {
      if (i === transactions.length - 1) {
        t.outputs.forEach(output => {
          const receipt = output.receipt
          if (!receipt) return
          const tli = {} as Transaction
          tli.conflictType = receipt.excepted ?? 'End' 
          tli.type = 'TRANSACTION'
          tli.transaction = {} as TransactionSummary
          tli.transaction.id = 'hydra_' + '0x'+ receipt.contractAddressHex + '_0x' + t.id
          tli.transaction.timestamp = t.timestamp
          tli.transaction.txStatus = receipt.excepted === 'None' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED
          tli.transaction.txInfo = {} as Creation
          tli.transaction.txInfo.creator = {} as AddressEx
          tli.transaction.txInfo.factory = {} as AddressEx
          tli.transaction.txInfo.implementation = {} as AddressEx
          tli.transaction.txInfo.type = 'Creation'
          tli.transaction.txInfo.creator.value = hydraToHexAddress(receipt.sender, true)
          tli.transaction.txInfo.factory.value = SAFE_PROXY_FACTORY_ADDRESS
          tli.transaction.txInfo.implementation.value = SAFE_SINGLETON_ADDRESS
          tli.transaction.txInfo.transactionHash = '0x' + t.id
          tlp.results.push(tli)
        })
      }
      t.outputs.forEach(output => {
        const receipt = output.receipt
        if (!receipt) return
        const logs = getSafeLogs(receipt.logs as Log[])
        logs.forEach(log => {
          const tli = {} as Transaction
          tli.conflictType = receipt.excepted ?? 'End' 
          tli.type = 'TRANSACTION'
          tli.transaction = {} as TransactionSummary
          tli.transaction.id = 'hydra_' + '0x'+ receipt.contractAddressHex + '_0x' + t.id
          tli.transaction.timestamp = t.timestamp
          tli.transaction.txStatus = receipt.excepted === 'None' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED
          // tli.transaction.txInfo = {} as TransactionInfo
          switch(log.name) {
            case 'Transfer':
                tli.transaction.txInfo = {} as Transfer
                tli.transaction.txInfo.type = 'Transfer'
                const recipient = log.events.find(e => e.name === 'from').value
                tli.transaction.txInfo.sender = recipient
                tli.transaction.txInfo.recipient = log.events.find(e => e.name === 'to').value
                tli.transaction.txInfo.direction = recipient.substring(2) === address ? TransferDirection.INCOMING : TransferDirection.INCOMING
                tli.transaction.txInfo.transferInfo = {} as Erc20Transfer
                const token = t.qrc20TokenTransfers.find(transfer => transfer.addressHex === receipt.contractAddressHex)
                tli.transaction.txInfo.transferInfo.decimals = token.decimals
                tli.transaction.txInfo.transferInfo.tokenAddress = '0x' + token.addressHex
                tli.transaction.txInfo.transferInfo.tokenName = token.name
                tli.transaction.txInfo.transferInfo.tokenSymbol = token.symbol
                tli.transaction.txInfo.transferInfo.value = log.events.find(e => e.name === 'value').value
                tli.transaction.txInfo.transferInfo.logoUri = ''
              break
            case 'AddedOwner':
                tli.transaction.txInfo = {} as SettingsChange
                tli.transaction.txInfo.type = 'SettingsChange'
                tli.transaction.txInfo.settingsInfo = {} as AddOwner
                tli.transaction.txInfo.settingsInfo.type = SettingsInfoType.ADD_OWNER
                tli.transaction.txInfo.settingsInfo.owner = {} as AddressEx
                tli.transaction.txInfo.settingsInfo.owner.value = log.events[0].value
                tli.transaction.txInfo.settingsInfo.threshold = 1
                tli.transaction.txInfo.dataDecoded = {} as DataDecoded
                tli.transaction.txInfo.dataDecoded.method = 'addOwnerWithThreshold'
                tli.transaction.txInfo.dataDecoded.parameters = [] as Parameter[]
                tli.transaction.txInfo.dataDecoded.parameters[0] = log 
              break
          }
          tlp.results.push(tli)
        })        
      })
    })
    
    // const txlog = await hydraSdk.getTransactionReceipt(transactions[0].id)
    // console.log('--------------------- txLOG', txlog);
    return tlp
  } catch (e) {
    throw e
  }
}
