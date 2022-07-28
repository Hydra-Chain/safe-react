import { isAddress, isHexStrict } from 'web3-utils'
import { Utils, Decoder } from 'hydraweb3-js'

export const isValidAddress = (address?: string): boolean => {
  if (address) {
    // `isAddress` do not require the string to start with `0x`
    // `isHexStrict` ensures the address to start with `0x` aside from being a valid hex string
    return isHexStrict(address) && isAddress(address)
  }

  return false
}
export const isValidAddressHydra = (address?: string): boolean => {
  if (address) {
    try {
      return Utils.isHydraAddress(address) as boolean
    } catch (e) {
      return false
    }
    // // `isAddress` do not require the string to start with `0x`
    // // `isHexStrict` ensures the address to start with `0x` aside from being a valid hex string
    // return isHexStrict(address) && isAddress(address)
  }

  return false
}

export const isValidAddressHydraHex = (address?: string): boolean => {
  if (address) {
    try {
      return Utils.isHydraAddress(Decoder.toHydraAddress(address)) as boolean
    } catch (e) {
      return false
    }
  }

  return false
}
