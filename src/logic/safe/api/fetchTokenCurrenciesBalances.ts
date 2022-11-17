import { TokenType } from '@gnosis.pm/safe-apps-sdk'
import { getBalances, SafeBalanceResponse, TokenInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { fetchAddressInfo, fetchBalances, fetchHydraPrice } from 'src/logic/hydra/api/explorer'
import { hydraFromHexAddress } from 'src/logic/hydra/utils'
import { ZERO_ADDRESS } from 'src/logic/wallets/ethAddresses'
// import { checksumAddress } from 'src/utils/checksumAddress'

export type TokenBalance = {
  tokenInfo: TokenInfo
  balance: string
  fiatBalance: string
  fiatConversion: string
}

type FetchTokenCurrenciesBalancesProps = {
  safeAddress: string
  selectedCurrency: string
  excludeSpamTokens?: boolean
  trustedTokens?: boolean
}

export const fetchTokenCurrenciesBalances = async ({
  safeAddress,
  selectedCurrency,
  excludeSpamTokens = true,
  trustedTokens = false,
}: FetchTokenCurrenciesBalancesProps): Promise<SafeBalanceResponse> => {
  const address = safeAddress
  return fetchBalances(address)
  // return getBalances(_getChainId(), address, selectedCurrency, {
  //   exclude_spam: excludeSpamTokens,
  //   trusted: trustedTokens,
  // })
}
