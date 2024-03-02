import { ChainInfo, RPC_AUTHENTICATION } from '@gnosis.pm/safe-react-gateway-sdk'
import { setWeb3ReadOnly } from 'src/logic/wallets/getWeb3'

// Cache is required as loading Redux store directly is an anit-pattern
let chains: ChainInfo[] = []

const mockChains = [
  {
    chainId: '1',
    chainName: 'HYDRA',
    description: 'The main HYDRA network',
    l2: false,
    nativeCurrency: {
      name: 'Hydra',
      symbol: 'HYDRA',
      decimals: 8,
      logoUri: 'https://safe-transaction-assets.safe.global/chains/1/currency_logo.png',
    },
    transactionService: 'https://safe-transaction-mainnet.safe.global',
    blockExplorerUriTemplate: {
      address: 'https://explorer.hydrachain.org/address/{{address}}',
      txHash: 'https://explorer.hydrachain.org/tx/{{txHash}}',
      api: 'https://api.etherscan.io/api?module={{module}}&action={{action}}&address={{address}}&apiKey={{apiKey}}',
    },
    disabledWallets: ['NONE', 'walletConnect'],
    ensRegistryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    features: [
      'CONTRACT_INTERACTION',
      'DEFAULT_TOKENLIST',
      'DOMAIN_LOOKUP',
      'EIP1271',
      'EIP1559',
      'ERC721',
      'MOONPAY_MOBILE',
      'RISK_MITIGATION',
      'SAFE_APPS',
      'SAFE_TX_GAS_OPTIONAL',
      'SPENDING_LIMIT',
      'TX_SIMULATION',
    ],
    gasPrice: [
      {
        type: 'oracle',
        uri: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=JNFAU892RF9TJWBU3EV7DJCPIWZY8KEMY1',
        gasParameter: 'FastGasPrice',
        gweiFactor: '1000000000.000000000',
      },
    ],
    publicRpcUri: {
      authentication: 'NO_AUTHENTICATION',
      value: 'https://cloudflare-eth.com',
    },
    rpcUri: {
      authentication: 'API_KEY_PATH',
      value: 'https://mainnet.infura.io/v3/',
    },
    safeAppsRpcUri: {
      authentication: 'API_KEY_PATH',
      value: 'https://testnet.infura.io/v3/',
    },
    shortName: 'hyd',
    theme: {
      textColor: '#001428',
      backgroundColor: '#DDDDDD',
    },
  },
  {
    chainId: '2',
    chainName: 'HYDRA TestNet',
    description: 'The testnet HYDRA network',
    l2: false,
    nativeCurrency: {
      name: 'Hydra',
      symbol: 'HYDRA',
      decimals: 8,
      logoUri: 'https://safe-transaction-assets.safe.global/chains/1/currency_logo.png',
    },
    transactionService: 'https://safe-transaction-mainnet.safe.global',
    blockExplorerUriTemplate: {
      address: 'https://testexplorer.hydrachain.org/address/{{address}}',
      txHash: 'https://testexplorer.hydrachain.org/tx/{{txHash}}',
      api: 'https://api.etherscan.io/api?module={{module}}&action={{action}}&address={{address}}&apiKey={{apiKey}}',
    },
    disabledWallets: ['NONE', 'walletConnect'],
    ensRegistryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    features: [
      'CONTRACT_INTERACTION',
      'DEFAULT_TOKENLIST',
      'DOMAIN_LOOKUP',
      'EIP1271',
      'EIP1559',
      'ERC721',
      'MOONPAY_MOBILE',
      'RISK_MITIGATION',
      'SAFE_APPS',
      'SAFE_TX_GAS_OPTIONAL',
      'SPENDING_LIMIT',
      'TX_SIMULATION',
    ],
    gasPrice: [
      {
        type: 'oracle',
        uri: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=JNFAU892RF9TJWBU3EV7DJCPIWZY8KEMY1',
        gasParameter: 'FastGasPrice',
        gweiFactor: '1000000000.000000000',
      },
    ],
    publicRpcUri: {
      authentication: 'NO_AUTHENTICATION',
      value: 'https://cloudflare-eth.com',
    },
    rpcUri: {
      authentication: 'API_KEY_PATH',
      value: 'https://testnet.infura.io/v3/',
    },
    safeAppsRpcUri: {
      authentication: 'API_KEY_PATH',
      value: 'https://testnet.infura.io/v3/',
    },
    shortName: 'testhyd',
    theme: {
      textColor: '#001428',
      backgroundColor: '#DDDDDD',
    },
  },
]
export const getChains = (): ChainInfo[] => chains

export const loadChains = async () => {
  // const { results = [] } = await getChainsConfig()
  const results = mockChains as ChainInfo[]
  chains = results
  // Set the initail web3 provider after loading chains
  setWeb3ReadOnly()
}

// An empty template is required because `getChain()` uses `find()` on load
export const emptyChainInfo: ChainInfo = {
  transactionService: '',
  chainId: '',
  chainName: '',
  shortName: '',
  l2: false,
  description: '',
  rpcUri: { authentication: '' as RPC_AUTHENTICATION, value: '' },
  publicRpcUri: { authentication: '' as RPC_AUTHENTICATION, value: '' },
  safeAppsRpcUri: { authentication: '' as RPC_AUTHENTICATION, value: '' },
  blockExplorerUriTemplate: {
    address: '',
    txHash: '',
    api: '',
  },
  nativeCurrency: {
    name: '',
    symbol: '',
    decimals: 0,
    logoUri: '',
  },
  theme: { textColor: '', backgroundColor: '' },
  ensRegistryAddress: '',
  gasPrice: [],
  disabledWallets: [],
  features: [],
}
