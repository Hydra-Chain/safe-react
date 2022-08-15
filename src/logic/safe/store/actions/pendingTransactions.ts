import { createAction } from 'redux-actions'
import { fetchGeneralInfo } from 'src/logic/hydra/api/explorer'
import {
  AddPendingTransactionPayload,
  RemovePendingTransactionPayload,
} from 'src/logic/safe/store/reducer/pendingTransactions'
import { Dispatch } from './types'

export enum PENDING_TRANSACTIONS_ACTIONS {
  ADD = 'pendingTransactions/add',
  REMOVE = 'pendingTransactions/remove',
}

export const addPendingTransaction = createAction<AddPendingTransactionPayload>(PENDING_TRANSACTIONS_ACTIONS.ADD)
export const removePendingTransaction = createAction<RemovePendingTransactionPayload>(
  PENDING_TRANSACTIONS_ACTIONS.REMOVE,
)

export const setPendingTransaction = (details: { id: string; txHash: string }) => {
  return async (dispatch: Dispatch): Promise<void> => {
    let block: number | undefined
    try {
      const { height } = await fetchGeneralInfo()
      block = height
    } catch {}

    const pendingTransaction = {
      ...details,
      block,
    }

    dispatch(addPendingTransaction(pendingTransaction))
  }
}
