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
