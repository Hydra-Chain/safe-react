import { getBalances, SafeBalanceResponse, TokenInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { fetchAddressInfo } from 'src/logic/hydra/api/explorer'
import { hydraFromHexAddress } from 'src/logic/hydra/utils'
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
  const info = await fetchAddressInfo(hydraFromHexAddress(address))
  console.log('fetchTokenCurrenciesBalances', info)
  const rrr = await getBalances(_getChainId(), '0x' + address, selectedCurrency, {
    exclude_spam: excludeSpamTokens,
    trusted: trustedTokens,
  })
  console.log('----------------------------getBalances', rrr)

  return getBalances(_getChainId(), address, selectedCurrency, {
    exclude_spam: excludeSpamTokens,
    trusted: trustedTokens,
  })
}
