import { AddressEx, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'

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
