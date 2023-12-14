// export const SAFE_SINGLETON_ADDRESS = '0xf6686de0876fef3b677f4204d2145fc7ddbeeea9'
// export const SAFE_PROXY_FACTORY_ADDRESS = '0x80a08806dc81d0fc3eee4db70f07582c8d10b898'
// export const DEPOSIT_TO_SAFE_CONTRACT_ADDRESS = '23e16fd8f90f8ef174e1e1465c242f42926bbca2'

const addresses = {
  // mainnet
  '1': {
    SAFE_SINGLETON_ADDRESS: '0xf6686de0876fef3b677f4204d2145fc7ddbeeea9',
    SAFE_PROXY_FACTORY_ADDRESS: '0x80a08806dc81d0fc3eee4db70f07582c8d10b898',
    DEPOSIT_TO_SAFE_CONTRACT_ADDRESS: '23e16fd8f90f8ef174e1e1465c242f42926bbca2',
  },
  // testnet
  '2': {
    SAFE_SINGLETON_ADDRESS: '0x1d1c0f8a07d008ec786356207ec43658393b0775',
    SAFE_PROXY_FACTORY_ADDRESS: '0x3af8ed77c22545c0d8bcfc7d3450b26f78d8a9ff',
    DEPOSIT_TO_SAFE_CONTRACT_ADDRESS: 'd9ae2e68d5d24b34f175be1f1895202888294d1b',
  },
}

export const getSingletonAddress = (chainId: string) => {
  return addresses[chainId].SAFE_SINGLETON_ADDRESS ?? ''
}

export const getProxyFactorynAddress = (chainId: string) => {
  return addresses[chainId].SAFE_PROXY_FACTORY_ADDRESS ?? ''
}

export const getDepositToSafeAddress = (chainId: string) => {
  return addresses[chainId].DEPOSIT_TO_SAFE_CONTRACT_ADDRESS ?? ''
}
