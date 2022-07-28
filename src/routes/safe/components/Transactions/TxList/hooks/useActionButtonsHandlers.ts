import { MultisigExecutionInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import { MouseEvent as ReactMouseEvent, useCallback, useContext, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  isMultiSigExecutionDetails,
  LocalTransactionStatus,
  Transaction,
} from 'src/logic/safe/store/models/types/gateway.d'
import { userAccountSelector } from 'src/logic/wallets/store/selectors'
import { addressInList } from 'src/routes/safe/components/Transactions/TxList/utils'
import { useTransactionActions } from './useTransactionActions'
import { TransactionActionStateContext } from 'src/routes/safe/components/Transactions/TxList/TxActionProvider'
import { TxHoverContext } from 'src/routes/safe/components/Transactions/TxList/TxHoverProvider'
import { TxLocationContext } from 'src/routes/safe/components/Transactions/TxList/TxLocationProvider'
import enqueueSnackbar from 'src/logic/notifications/store/actions/enqueueSnackbar'
import { NOTIFICATIONS } from 'src/logic/notifications'
import useTxStatus from 'src/logic/hooks/useTxStatus'
import { trackEvent } from 'src/utils/googleTagManager'
import { TX_LIST_EVENTS } from 'src/utils/events/txList'
import { getLocalStorageApprovedTransactionSchema } from 'src/logic/hydra/api/explorer'

type ActionButtonsHandlers = {
  canCancel: boolean
  handleConfirmButtonClick: (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => void
  handleCancelButtonClick: (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => void
  handleOnMouseEnter: () => void
  handleOnMouseLeave: () => void
  isPending: boolean
  disabledActions: boolean
}

export const useActionButtonsHandlers = (transaction: Transaction): ActionButtonsHandlers => {
  const currentUser = useSelector(userAccountSelector)
  const actionContext = useRef(useContext(TransactionActionStateContext))
  const hoverContext = useRef(useContext(TxHoverContext))
  const locationContext = useContext(TxLocationContext)
  const dispatch = useDispatch()
  const { canCancel, canConfirmThenExecute, canExecute } = useTransactionActions(transaction)
  const safeTxHash = (transaction.txDetails?.detailedExecutionInfo as any)?.safeTxHash
  const approvedTransactionSchema = getLocalStorageApprovedTransactionSchema()
  console.log('approvedTransactionSchema[safeTxHash]', approvedTransactionSchema[safeTxHash])
  if (safeTxHash && approvedTransactionSchema[safeTxHash]) {
    for (const txHash in approvedTransactionSchema[safeTxHash]) {
      console.log('approvedTransactionSchema[safeTxHash][txHash]', approvedTransactionSchema[safeTxHash][txHash])
      if (approvedTransactionSchema[safeTxHash][txHash] === 0) {
        transaction.txStatus = LocalTransactionStatus.PENDING
        // txStatus = LocalTransactionStatus.PENDING
      }
    }
  }
  // transaction.txStatus = TransactionStatus.PENDING
  // console.log('useActionButtonsHandlers', transaction);
  const txStatus = useTxStatus(transaction)
  const isPending = txStatus === LocalTransactionStatus.PENDING

  const handleConfirmButtonClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation()
      if (transaction.txDetails && isMultiSigExecutionDetails(transaction.txDetails.detailedExecutionInfo)) {
        const details = transaction.txDetails.detailedExecutionInfo
        if (
          (canExecute && details.confirmationsRequired > details.confirmations.length) ||
          (canConfirmThenExecute && details.confirmationsRequired - 1 > details.confirmations.length)
        ) {
          dispatch(enqueueSnackbar(NOTIFICATIONS.TX_FETCH_SIGNATURES_ERROR_MSG))
          return
        }
      }
      const actionSelected = canExecute || canConfirmThenExecute ? 'execute' : 'confirm'

      trackEvent(TX_LIST_EVENTS[actionSelected.toUpperCase()])
      console.log('actionSelected', actionSelected)
      console.log('actionContext', actionContext)

      actionContext.current.selectAction({
        actionSelected,
        transactionId: transaction.id,
      })
    },
    [canConfirmThenExecute, canExecute, dispatch, transaction.id, transaction.txDetails],
  )

  const handleCancelButtonClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation()

      trackEvent(TX_LIST_EVENTS.REJECT)

      actionContext.current.selectAction({
        actionSelected: 'cancel',
        transactionId: transaction.id,
      })
    },
    [transaction.id],
  )

  const handleOnMouseEnter = useCallback(() => {
    if (canExecute) {
      hoverContext.current.setActiveHover(transaction.id)
    }
  }, [canExecute, transaction.id])

  const handleOnMouseLeave = useCallback(() => {
    hoverContext.current.setActiveHover()
  }, [])

  const signaturePending = addressInList(
    (transaction.executionInfo as MultisigExecutionInfo)?.missingSigners ?? undefined,
  )

  console.log('currentUser', currentUser)
  console.log('isPending', isPending)
  console.log('txStatus', txStatus)

  const disabledActions =
    !currentUser ||
    isPending ||
    (txStatus === LocalTransactionStatus.AWAITING_EXECUTION && locationContext.txLocation === 'queued.queued') ||
    (txStatus === LocalTransactionStatus.AWAITING_CONFIRMATIONS && !signaturePending(currentUser))

  return {
    canCancel,
    handleConfirmButtonClick,
    handleCancelButtonClick,
    handleOnMouseEnter,
    handleOnMouseLeave,
    isPending,
    disabledActions,
  }
}
