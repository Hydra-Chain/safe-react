import { AddressEx, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import { Encoder, Decoder } from 'hydraweb3-js'

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

export const hydraToHexAddress = (address: string, withPrefix = false): string => {
  const addressHex = Encoder.addressToHex(address)
  const addr = addressHex.substr(addressHex.length - 40)
  return withPrefix ? '0x' + addr : addr
}

export const hydraFromHexAddress = (address: string): string => {
  const addressHex = Decoder.toHydraAddress(address)
  return addressHex
}
