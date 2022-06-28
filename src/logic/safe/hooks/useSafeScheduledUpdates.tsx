import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { currentChainId } from 'src/logic/config/store/selectors'
import { fetchSafe } from 'src/logic/safe/store/actions/fetchSafe'
import { providerHydraSdkSelector, userAccountSelector } from 'src/logic/wallets/store/selectors'
import { SAFE_POLLING_INTERVAL } from 'src/utils/constants'

export const useSafeScheduledUpdates = (safeAddress?: string, isInitialLoad = false): void => {
  const dispatch = useDispatch()
  const [pollCount, setPollCount] = useState<number>(0)
  const chainId = useSelector(currentChainId)
  const addressHydra = useSelector(userAccountSelector)
  const hydraSdk = useSelector(providerHydraSdkSelector)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (safeAddress) {
        dispatch(fetchSafe(safeAddress, hydraSdk, addressHydra ?? '', isInitialLoad))
      }
      setPollCount((prev) => prev + 1)
    }, SAFE_POLLING_INTERVAL)

    return () => {
      clearTimeout(timer)
    }
  }, [dispatch, safeAddress, chainId, pollCount, setPollCount, isInitialLoad, hydraSdk, addressHydra])
}
