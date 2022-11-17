import {
  SafeTransactionEstimationRequest,
  SafeTransactionEstimation,
  Operation,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { getGnosisProxyNonce, sendWithState } from 'src/logic/hydra/contractInteractions/utils'
import { Dispatch } from '../store/actions/types'

// import { _getChainId } from 'src/config'
// import { checksumAddress } from 'src/utils/checksumAddress'

type FetchSafeTxGasEstimationProps = {
  safeAddress: string
} & SafeTransactionEstimationRequest

export const fetchSafeTxGasEstimation = async (
  dispatch: Dispatch,
  { safeAddress, ...body }: FetchSafeTxGasEstimationProps,
): Promise<SafeTransactionEstimation> => {
  // return postSafeGasEstimation(_getChainId(), safeAddress, body)
  if (body) {
  }
  const nonce = await dispatch(sendWithState(getGnosisProxyNonce, { safeAddress }))
  return {
    currentNonce: Number(nonce),
    recommendedNonce: Number(nonce),
    safeTxGas: '0',
  } as unknown as Promise<SafeTransactionEstimation>
}

export const getRecommendedNonce = async (safeAddress: string, dispatch: Dispatch): Promise<number> => {
  const { recommendedNonce } = await fetchSafeTxGasEstimation(dispatch, {
    safeAddress,
    value: '0',
    operation: Operation.CALL,
    // Workaround: use a cancellation transaction to fetch only the recommendedNonce
    to: safeAddress,
    data: '0x',
  })
  return recommendedNonce
}
