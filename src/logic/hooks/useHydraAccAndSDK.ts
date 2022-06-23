import { useEffect, useState } from 'react'
import useHydra from './useHydra'

export function isEmptyObj(obj: Record<string, any>) {
  if (!obj) {
    return true
  }
  return Object.keys(obj).length === 0
}

export interface Account {
  address: string
  balance: string
  loggedIn: boolean
  name: string
  network: string
}

export let account: Account
export let hydraweb3RPC: any

export default function (walletExtension: any, hydraweb3Extension: any) {
  if (!isEmptyObj(walletExtension)) {
    account = walletExtension
  }
  if (!isEmptyObj(hydraweb3Extension)) {
    hydraweb3RPC = hydraweb3Extension
  }
}

export function useHydraLibrary() {
  const { hydraSDK } = useHydra()
  const [library, setLibrary] = useState(hydraweb3RPC)

  useEffect(() => {
    if (!isEmptyObj(hydraSDK)) {
      setLibrary(hydraSDK)
    }
  }, [hydraSDK])

  return [library]
}

export function useHydraAccount() {
  const { hydraSDK } = useHydra()
  const [acc, setAccount] = useState(account)

  useEffect(() => {
    setAccount(account)
  }, [hydraSDK])

  return [acc]
}

export function useHydraWalletAddress() {
  const [account] = useHydraAccount()
  const [addr, setAddr] = useState(account?.address)

  useEffect(() => {
    setAddr(account?.address)
  }, [account])

  return [addr]
}
