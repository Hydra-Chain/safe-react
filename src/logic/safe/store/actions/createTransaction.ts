import { Operation, TransactionDetails } from '@gnosis.pm/safe-react-gateway-sdk'
import { AnyAction } from 'redux'
import { ThunkAction } from 'redux-thunk'

import { isSmartContractWallet } from 'src/logic/wallets/getWeb3'
import { getGnosisSafeInstanceAt } from 'src/logic/contracts/safeContracts'
import { createTxNotifications } from 'src/logic/notifications'
import {
  getApprovalTransaction,
  getExecutionTransaction,
  saveTxToHistory,
  tryOffChainSigning,
} from 'src/logic/safe/transactions'
import { estimateSafeTxGas, SafeTxGasEstimationProps, createSendParams } from 'src/logic/safe/transactions/gas'
import { currentSafeCurrentVersion } from 'src/logic/safe/store/selectors'
import { ZERO_ADDRESS } from 'src/logic/wallets/ethAddresses'
import { EMPTY_DATA } from 'src/logic/wallets/ethTransactions'
import { providerSelector } from 'src/logic/wallets/store/selectors'
import { getNonce, canExecuteCreatedTx, navigateToTx } from 'src/logic/safe/store/actions/utils'
import fetchTransactions from './transactions/fetchTransactions'
import { AppReduxState } from 'src/store'
import { Dispatch, DispatchReturn } from './types'
import { checkIfOffChainSignatureIsPossible, getPreValidatedSignatures } from 'src/logic/safe/safeTxSigner'
import { TxParameters } from 'src/routes/safe/container/hooks/useTransactionParameters'
import { Errors, logError } from 'src/logic/exceptions/CodedException'
import { removePendingTransaction, setPendingTransaction } from 'src/logic/safe/store/actions/pendingTransactions'
import { _getChainId } from 'src/config'
import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'
import * as aboutToExecuteTx from 'src/logic/safe/utils/aboutToExecuteTx'
import { getLastTransaction } from 'src/logic/safe/store/selectors/gatewayTransactions'
import { TxArgs } from 'src/logic/safe/store/models/types/transaction'
import { getContractErrorMessage } from 'src/logic/contracts/safeContractErrors'
import { isWalletRejection } from 'src/logic/wallets/errors'
import { trackEvent } from 'src/utils/googleTagManager'
import { WALLET_EVENTS } from 'src/utils/events/wallet'
import { hydraToHexAddress, setCurrentTxWaitingExecutionDetails } from 'src/logic/hydra/utils'
import {
  getGnosisProxyTransactionHash,
  safeGnosisSendAsset,
  sendWithState,
  setGnosisProxyOracle,
} from 'src/logic/hydra/contractInteractions/utils'
import {
  getLocalStorageApprovedTransactionSchema,
  setLocalStorageApprovedTransactionSchema,
} from 'src/logic/hydra/api/explorer'

export interface CreateTransactionArgs {
  navigateToTransactionsTab?: boolean
  notifiedTransaction: string
  operation?: number
  origin?: string | null
  safeAddress: string
  to: string
  txData?: string
  txNonce?: number | string
  valueInWei: string
  safeTxGas?: string
  ethParameters?: Pick<TxParameters, 'ethNonce' | 'ethGasLimit' | 'ethGasPriceInGWei' | 'ethMaxPrioFeeInGWei'>
  delayExecution?: boolean
}

type RequiredTxProps = CreateTransactionArgs &
  Required<Pick<CreateTransactionArgs, 'txData' | 'operation' | 'navigateToTransactionsTab' | 'origin'>>

type CreateTransactionAction = ThunkAction<Promise<void | string>, AppReduxState, DispatchReturn, AnyAction>
type ConfirmEventHandler = (safeTxHash: string) => void
type ErrorEventHandler = () => void

const getSafeTxGas = async (txProps: RequiredTxProps, safeVersion: string, dispatch: Dispatch): Promise<string> => {
  const estimationProps: SafeTxGasEstimationProps = {
    safeAddress: txProps.safeAddress,
    txData: txProps.txData,
    txRecipient: txProps.to,
    txAmount: txProps.valueInWei,
    operation: txProps.operation,
  }

  let safeTxGas = '0'
  try {
    safeTxGas = await estimateSafeTxGas(estimationProps, safeVersion, dispatch)
  } catch (err) {
    logError(Errors._617, err.message)
  }
  return safeTxGas
}

export class TxSender {
  notifications: ReturnType<typeof createTxNotifications>
  nonce: string
  isFinalization: boolean
  txArgs: TxArgs
  safeTxHash: string
  txProps: RequiredTxProps
  from: string
  dispatch: Dispatch
  safeInstance: GnosisSafe
  safeVersion: string
  txId: string

  // Assigned upon `transactionHash` promiEvent
  txHash: undefined | string

  // On transaction completion (either confirming or executing)
  async onComplete(signature?: string, confirmCallback?: ConfirmEventHandler): Promise<void> {
    const { txArgs, safeTxHash, txProps, dispatch, notifications, isFinalization } = this

    // Propose the tx to the backend
    // 1) If signing
    // 2) If creating a new tx (no txId yet)
    let txDetails: TransactionDetails | undefined
    if (!isFinalization || !this.txId) {
      try {
        txDetails = await saveTxToHistory({ ...txArgs, signature, origin: txProps.origin }, dispatch, this.txHash)
        setCurrentTxWaitingExecutionDetails(txDetails)
        this.txId = txDetails.txId
        // this.safeTxHash = txDetails.
      } catch (err) {
        logError(Errors._816, err.message)
        return
      }
    }

    if (isFinalization && this.txId && this.txHash) {
      dispatch(setPendingTransaction({ id: this.txId, txHash: this.txHash }))
    }

    notifications.closePending()

    trackEvent(signature ? WALLET_EVENTS.OFF_CHAIN_SIGNATURE : WALLET_EVENTS.ON_CHAIN_INTERACTION)

    // This is used to communicate the safeTxHash to a Safe App caller
    confirmCallback?.(safeTxHash)

    // Go to a tx deep-link

    if (txDetails && txProps.navigateToTransactionsTab) {
      navigateToTx(txProps.safeAddress, txDetails)
    }

    dispatch(fetchTransactions(_getChainId(), txProps.safeAddress))
  }

  async onError(err: Error & { code: number }, errorCallback?: ErrorEventHandler): Promise<void> {
    const { txArgs, isFinalization, from, txProps, dispatch, notifications, safeInstance, txId } = this

    errorCallback?.()

    notifications.closePending()

    // Existing transaction was being finalised (txId exists)
    if (isFinalization && txId) {
      dispatch(removePendingTransaction({ id: txId }))
    }
    // Display a notification when user rejects the tx
    if (isWalletRejection(err)) {
      // show snackbar
      notifications.showOnRejection(err)
      return
    }

    const executeData = isFinalization
      ? safeInstance.methods
          .execTransaction(
            txProps.to,
            txProps.valueInWei,
            txProps.txData,
            txProps.operation,
            0,
            0,
            0,
            ZERO_ADDRESS,
            ZERO_ADDRESS,
            txArgs.sigs,
          )
          .encodeABI()
      : this.txHash && safeInstance.methods.approveHash(this.txHash).encodeABI()

    if (!executeData) {
      return
    }

    const contractErrorMessage = await getContractErrorMessage({
      safeInstance,
      from,
      data: executeData,
    })

    if (contractErrorMessage) {
      logError(Errors._803, contractErrorMessage)
      notifications.showOnError(err, contractErrorMessage)
    }
  }

  async onlyConfirm(): Promise<string | undefined> {
    const { txArgs, safeTxHash, txProps, safeVersion } = this
    // const { wallet } = onboard().getState()

    return await tryOffChainSigning(
      safeTxHash,
      { ...txArgs, sender: String(txArgs.sender), safeAddress: txProps.safeAddress },
      false,
      // isHardwareWallet(wallet),
      safeVersion,
    )
  }

  async sendTx(
    dispatch: Dispatch,
    confirmCallback?: ConfirmEventHandler,
    oracle?: { currentOracle: string; newOracle: string; gasLimit?: string },
    sentTx?: any,
  ): Promise<void> {
    const { txArgs, isFinalization, from, safeTxHash, txProps } = this
    console.log('txArgs', txArgs)

    const tx = isFinalization
      ? getExecutionTransaction(txArgs)
      : getApprovalTransaction(this.safeInstance, safeTxHash, txArgs)
    const sendParams = createSendParams(from, txProps.ethParameters || {})
    console.log('oracle', oracle)
    console.log('isFinalization', isFinalization)
    console.log('tx', tx)

    const tx0 =
      sentTx ??
      (oracle
        ? await dispatch(
            sendWithState(setGnosisProxyOracle, {
              safeAddress: txProps.safeAddress,
              oracle: oracle.newOracle,
              gasLimit: oracle.gasLimit,
            }),
          )
        : await dispatch(sendWithState(safeGnosisSendAsset, { tx, sendParams, safeAddress: txProps.safeAddress })))

    this.txHash = '0x' + tx0.id
    const approvedTransactionSchema = getLocalStorageApprovedTransactionSchema()
    if (approvedTransactionSchema[safeTxHash]) {
      approvedTransactionSchema[safeTxHash][this.txHash] = 0
      setLocalStorageApprovedTransactionSchema(approvedTransactionSchema)
    }
    if (isFinalization) {
      aboutToExecuteTx.setNonce(txArgs.nonce)
    }
    this.onComplete(undefined, confirmCallback)
    // await tx.send(sendParams).once('transactionHash', (hash) => {
    //   this.txHash = hash

    //   if (isFinalization) {
    //     aboutToExecuteTx.setNonce(txArgs.nonce)
    //   }
    //   this.onComplete(undefined, confirmCallback)
    // })
  }

  async canSignOffchain(): Promise<boolean> {
    const { isFinalization, safeVersion } = this

    const isSmartContract = await isSmartContractWallet(this.from)
    return checkIfOffChainSignatureIsPossible(isFinalization, isSmartContract, safeVersion)
  }

  async submitTx(
    dispatch: Dispatch,
    confirmCallback?: ConfirmEventHandler,
    errorCallback?: ErrorEventHandler,
    oracle?: { currentOracle: string; newOracle: string; gasLimit?: string },
    sentTx?: any,
  ): Promise<string | undefined> {
    // const isOffchain = await this.canSignOffchain()
    const isOffchain = false

    // Off-chain signature
    if (!this.isFinalization && isOffchain) {
      try {
        const signature = await this.onlyConfirm()

        // WC + Safe receives "NaN" as a string instead of a sig
        if (signature && signature !== 'NaN') {
          this.onComplete(signature, confirmCallback)
        } else {
          throw Error('No signature received')
        }
      } catch (err) {
        logError(Errors._814, err.message)
        this.onError(err, errorCallback)
      }
      return
    }

    // On-chain signature or execution
    try {
      await this.sendTx(dispatch, confirmCallback, oracle, sentTx)
    } catch (err) {
      logError(Errors._803, err.message)
      this.onError(err, errorCallback)
    }

    // Return txHash to check if transaction was successful
    return this.txHash
  }

  static async _isOnboardReady() {
    return async (dispatch: Dispatch, getState: () => AppReduxState): Promise<boolean> => {
      const state = getState()
      return state.providers.loaded && !!state.providers.account
    }
  }

  async prepare(dispatch: Dispatch, state: AppReduxState, txProps: RequiredTxProps): Promise<void> {
    if (!dispatch(await TxSender._isOnboardReady())) {
      throw Error('No wallet connection')
    }

    // Selectors
    const { account } = providerSelector(state)
    this.from = hydraToHexAddress(account, true)

    this.safeVersion = currentSafeCurrentVersion(state)
    this.safeInstance = getGnosisSafeInstanceAt(txProps.safeAddress, this.safeVersion)

    // Notifications
    this.notifications = createTxNotifications(txProps.notifiedTransaction, txProps.origin, dispatch)

    // Use the user-provided none or the recommented nonce
    this.nonce = txProps.txNonce?.toString() || (await getNonce(txProps.safeAddress, this.safeVersion, dispatch))
    this.txProps = txProps
    this.dispatch = dispatch
  }
}

export const createTransaction = (
  props: CreateTransactionArgs,
  confirmCallback?: ConfirmEventHandler,
  errorCallback?: ErrorEventHandler,
  oracle?: { currentOracle: string; newOracle: string; gasLimit?: string },
  sentTx?: any,
): CreateTransactionAction => {
  return async (dispatch: Dispatch, getState: () => AppReduxState): Promise<void> => {
    const sender = new TxSender()

    // Selectors
    const state = getState()
    // Assign fallback values to certain props
    const txProps = {
      ...props,
      txData: props.txData ?? EMPTY_DATA,
      operation: props.operation ?? Operation.CALL,
      navigateToTransactionsTab: props.navigateToTransactionsTab ?? true,
      origin: props.origin ?? null,
    }

    // Populate instance vars
    try {
      await sender.prepare(dispatch, state, txProps)
    } catch (err) {
      logError(Errors._815, err.message)
      return
    }

    // Execute right away?
    sender.isFinalization =
      !props.delayExecution &&
      (await canExecuteCreatedTx(sender.safeInstance, sender.nonce, getLastTransaction(state), dispatch))
    if (txProps.to.length === 40) {
      txProps.to = '0x' + txProps.to
    }

    // Prepare a TxArgs object
    sender.txArgs = {
      safeInstance: sender.safeInstance,
      to: txProps.to,
      valueInWei: txProps.valueInWei,
      data: txProps.txData,
      operation: txProps.operation,
      nonce: Number.parseInt(sender.nonce),
      safeTxGas: txProps.safeTxGas ?? (await getSafeTxGas(txProps, sender.safeVersion, dispatch)),
      baseGas: '0',
      gasPrice: '0',
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      sender: sender.from,
      // We're making a new tx, so there are no other signatures
      // Just pass our own address for an unsigned execution
      // Contract will compare the sender address to this
      sigs: getPreValidatedSignatures(sender.from),
    }

    // SafeTxHash acts as the unique ID of a tx throughout the app

    const safeTxHash = await dispatch(
      sendWithState(getGnosisProxyTransactionHash, {
        safeInstance: sender.safeInstance,
        to: sender.txArgs.to,
        value: sender.txArgs.valueInWei,
        data: sender.txArgs.data,
        operation: sender.txArgs.operation,
        nonce: sender.txArgs.nonce,
        safeTxGas: sender.txArgs.safeTxGas,
        baseGas: sender.txArgs.baseGas,
        gasPrice: sender.txArgs.gasPrice,
        gasToken: sender.txArgs.gasToken,
        refundReceiver: sender.txArgs.refundReceiver,
        sender: sender.txArgs.sender,
        origin: '',
        signature: '',
      }),
    )
    // sender.safeTxHash = generateSafeTxHash(txProps.safeAddress, sender.safeVersion, sender.txArgs)
    sender.safeTxHash = safeTxHash

    // Start the creation
    sender.submitTx(dispatch, confirmCallback, errorCallback, oracle, sentTx)
  }
}
