import { useSelector } from 'react-redux'
import { getRecommendedNonce } from 'src/logic/safe/api/fetchSafeTxGasEstimation'
import { getLastTxNonce } from 'src/logic/safe/store/selectors/gatewayTransactions'
import useAsync from 'src/logic/hooks/useAsync'
import { Dispatch } from '../safe/store/actions/types'

const useRecommendedNonce = (safeAddress: string, dispatch: Dispatch): number => {
  const lastTxNonce = useSelector(getLastTxNonce) || -1

  const [result] = useAsync<number>(() => {
    return getRecommendedNonce(safeAddress, dispatch)
  }, [safeAddress])

  return result == null ? lastTxNonce + 1 : result
}

export default useRecommendedNonce
