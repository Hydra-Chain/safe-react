import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import fetchLatestMasterContractVersion from 'src/logic/safe/store/actions/fetchLatestMasterContractVersion'
import { fetchSafe } from 'src/logic/safe/store/actions/fetchSafe'
import { Dispatch } from 'src/logic/safe/store/actions/types.d'
import { updateAvailableCurrencies } from 'src/logic/currencyValues/store/actions/updateAvailableCurrencies'
import { currentChainId } from 'src/logic/config/store/selectors'
import { providerHydraSdkSelector, userAccountSelector } from 'src/logic/wallets/store/selectors'

export const useLoadSafe = (safeAddress?: string): void => {
  const dispatch = useDispatch<Dispatch>()
  const chainId = useSelector(currentChainId)
  const addressHydra = useSelector(userAccountSelector)
  const hydraSdk = useSelector(providerHydraSdkSelector)

  useEffect(() => {
    if (!safeAddress) return

    const load = async () => {
      dispatch(fetchLatestMasterContractVersion())
      dispatch(fetchSafe(safeAddress, true))
      dispatch(updateAvailableCurrencies())
    }

    load()
  }, [dispatch, safeAddress, chainId, addressHydra, hydraSdk])
}
