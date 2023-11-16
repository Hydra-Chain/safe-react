import { MultisigExecutionInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import { ReactElement } from 'react'

import useTxStatus from 'src/logic/hooks/useTxStatus'
import { LocalTransactionStatus, Transaction } from 'src/logic/safe/store/models/types/gateway.d'
import { useAssetInfo } from './hooks/useAssetInfo'
import { useTransactionStatus } from './hooks/useTransactionStatus'
import { useTransactionType } from './hooks/useTransactionType'
import { TxCollapsed } from './TxCollapsed'

export type CalculatedVotes = { votes: string; submitted: number; required: number }

const calculateVotes = (executionInfo: MultisigExecutionInfo, isPending: boolean): CalculatedVotes | undefined => {
  if (!executionInfo) return

  const submitted = executionInfo.confirmationsSubmitted
  let required = executionInfo.confirmationsRequired

  if (!required || required === 0) {
    let current = localStorage.getItem('_immortal|v2_MAINNET__CURRENT_SESSION')
    current = JSON.parse(current ?? '')
    current = current?.['currentSafeAddress']
    let safes = localStorage.getItem('_immortal|v2_MAINNET__SAFES')
    safes = JSON.parse(safes ?? '')
    const safe = safes?.[current ?? ''] ?? {}
    required = safe.threshold
  }

  if (isPending && submitted < required) return

  return {
    votes: `${submitted} out of ${required}`,
    submitted,
    required,
  }
}

type TxQueuedCollapsedProps = {
  isGrouped?: boolean
  transaction: Transaction
}

export const TxQueueCollapsed = ({ isGrouped = false, transaction }: TxQueuedCollapsedProps): ReactElement => {
  const executionInfo = transaction.executionInfo as MultisigExecutionInfo
  const nonce = executionInfo?.nonce
  const type = useTransactionType(transaction)
  const info = useAssetInfo(transaction.txInfo)
  const status = useTransactionStatus(transaction)
  const txStatus = useTxStatus(transaction)
  const isPending = txStatus === LocalTransactionStatus.PENDING
  const votes = calculateVotes(executionInfo, isPending)

  return (
    <TxCollapsed
      transaction={transaction}
      isGrouped={isGrouped}
      nonce={nonce}
      type={type}
      info={info}
      time={transaction.timestamp}
      votes={votes}
      status={status}
    />
  )
}
