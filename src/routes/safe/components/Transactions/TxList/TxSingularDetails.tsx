import { ReactElement, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '@gnosis.pm/safe-react-components'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { TransactionDetails, TransactionStatus } from '@gnosis.pm/safe-react-gateway-sdk'

import { isTxQueued, TxLocation, Transaction } from 'src/logic/safe/store/models/types/gateway.d'
import {
  extractPrefixedSafeAddress,
  generateSafeRoute,
  SafeRouteSlugs,
  SAFE_ROUTES,
  TRANSACTION_ID_SLUG,
} from 'src/routes/routes'
import { Centered } from './styled'
import { TxLocationContext } from './TxLocationProvider'
import { AppReduxState } from 'src/store'
import { makeTxFromDetails } from './utils'
import { QueueTxList } from './QueueTxList'
import { HistoryTxList } from './HistoryTxList'
import FetchError from '../../FetchError'
import { getTransactionWithLocationByAttribute } from 'src/logic/safe/store/selectors/gatewayTransactions'
import { fetchSafeTransactionDetails, getLocalStorageApprovedTransactionSchema } from 'src/logic/hydra/api/explorer'
import useSafeAddress from 'src/logic/currentSession/hooks/useSafeAddress'
import { currentTxWaitingExecutionDetails } from 'src/logic/hydra/utils'

const useStoredTx = (txId?: string): { txLocation: TxLocation; transaction?: Transaction } | null => {
  return (
    useSelector(
      (state: AppReduxState) =>
        txId ? getTransactionWithLocationByAttribute(state, { attributeName: 'id', attributeValue: txId }) : undefined,
      shallowEqual,
    ) || null
  )
}
// let interval: NodeJS.Timer
const TxSingularDetails = (): ReactElement => {
  // const [count, setCount] = useState(0)
  // Get a safeTxHash from the URL
  const { [TRANSACTION_ID_SLUG]: txId = '' } = useParams<SafeRouteSlugs>()
  const storedTx = useStoredTx(txId)
  const dispatch = useDispatch()
  const { safeAddress } = useSafeAddress()
  const [fetchedTx, setFetchedTx] = useState<TransactionDetails | undefined>()
  const [error, setError] = useState()

  useEffect(() => {
    setFetchedTx(undefined)
    setError(undefined)
    const interval = setInterval(async () => {
      try {
        const td = await fetchSafeTransactionDetails(txId, dispatch, safeAddress)
        if (td) {
          setFetchedTx(td)
          clearInterval(interval)
        }
      } catch (e) {}
    }, 6000)
    return () => clearInterval(interval)
  }, [txId, dispatch, safeAddress])

  console.log('fetchedTx', fetchedTx)
  console.log('currentTxWaitingExecutionDetails', currentTxWaitingExecutionDetails)

  if (fetchedTx) {
    const approvedTransactionSchema = getLocalStorageApprovedTransactionSchema()
    const safeTxHash = (fetchedTx?.detailedExecutionInfo as any)?.safeTxHash
    if (safeTxHash && approvedTransactionSchema[safeTxHash]) {
      for (const txHash in approvedTransactionSchema[safeTxHash]) {
        if (approvedTransactionSchema[safeTxHash][txHash] === 0) {
          fetchedTx.txStatus = TransactionStatus.PENDING
        }
      }
    }
  }

  if (!fetchedTx && !error && currentTxWaitingExecutionDetails) {
    setFetchedTx(currentTxWaitingExecutionDetails)
  }

  if (error) {
    const safeParams = extractPrefixedSafeAddress()
    return (
      <FetchError
        text="Transaction not found"
        buttonText="See all transactions"
        redirectRoute={generateSafeRoute(SAFE_ROUTES.TRANSACTIONS, safeParams)}
      />
    )
  }

  const detailedTx = storedTx?.transaction || (fetchedTx?.txId ? makeTxFromDetails(fetchedTx) : null)
  console.log('detailedTx', detailedTx)

  if (detailedTx?.txDetails) {
    detailedTx.timestamp = detailedTx.txDetails.executedAt ?? 0
  }

  if (!detailedTx) {
    return (
      <Centered padding={10}>
        <Loader size="sm" />
      </Centered>
    )
  }

  const isQueue = isTxQueued(detailedTx.txStatus)
  const TxList = isQueue ? QueueTxList : HistoryTxList
  const fallbackLocation: TxLocation = isQueue ? 'queued.queued' : 'history'

  return (
    <TxLocationContext.Provider value={{ txLocation: storedTx?.txLocation || fallbackLocation }}>
      <TxList transactions={[[detailedTx.timestamp.toString(), [detailedTx]]]} />
    </TxLocationContext.Provider>
  )
}

export default TxSingularDetails
