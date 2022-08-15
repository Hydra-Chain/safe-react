import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Modal from 'src/components/Modal'
import { userAccountSelector } from 'src/logic/wallets/store/selectors'
import { addressBookAddOrUpdate } from 'src/logic/addressBook/store/actions'
import { TX_NOTIFICATION_TYPES } from 'src/logic/safe/transactions'
import { createTransaction } from 'src/logic/safe/store/actions/createTransaction'
import { makeAddressBookEntry } from 'src/logic/addressBook/model/addressBook'
import { Dispatch } from 'src/logic/safe/store/actions/types.d'
import { TxParameters } from 'src/routes/safe/container/hooks/useTransactionParameters'
import { OracleForm } from './screens/OwnerForm'
import { ReviewAddOracle } from './screens/Review'
import { Errors, logError } from 'src/logic/exceptions/CodedException'
import { currentSafeCurrentVersion } from 'src/logic/safe/store/selectors'
import { currentChainId } from 'src/logic/config/store/selectors'
import { trackEvent } from 'src/utils/googleTagManager'
import { SETTINGS_EVENTS } from 'src/utils/events/settings'
import useSafeAddress from 'src/logic/currentSession/hooks/useSafeAddress'
import { encodeMethodWithParams } from 'src/logic/hydra/contractInteractions/utils'
import { GnosisSafe } from 'src/logic/hydra/abis'

export type OracleValues = {
  oracleAddress: string
  oracleName: string
}

export const sendAddOracle = async (
  { oracleAddress }: OracleValues,
  safeAddress: string,
  safeVersion: string,
  txParameters: TxParameters,
  dispatch: Dispatch,
  connectedWalletAddress: string,
  delayExecution: boolean,
  oracle: string,
): Promise<void> => {
  const txData = encodeMethodWithParams(GnosisSafe, 'setOracle', ['0x' + oracleAddress])

  await dispatch(
    createTransaction(
      {
        safeAddress,
        to: safeAddress,
        valueInWei: '0',
        txData,
        txNonce: txParameters.safeNonce,
        safeTxGas: txParameters.safeTxGas,
        ethParameters: txParameters,
        notifiedTransaction: TX_NOTIFICATION_TYPES.SETTINGS_CHANGE_TX,
        delayExecution,
      },
      undefined,
      undefined,
      { currentOracle: oracle, newOracle: oracleAddress, gasLimit: txParameters.ethGasLimit },
    ),
  )

  trackEvent({ ...SETTINGS_EVENTS.ORACLE.ADD_ORACLE, label: oracleAddress })
}

type Props = {
  isOpen: boolean
  onClose: () => void
  oracle: string
}

export const AddOwnerModal = ({ oracle, isOpen, onClose }: Props): React.ReactElement => {
  const [activeScreen, setActiveScreen] = useState('selectOracle')
  const [values, setValues] = useState<OracleValues>({ oracleName: '', oracleAddress: '' })
  const dispatch = useDispatch()
  const { safeAddress } = useSafeAddress()
  const safeVersion = useSelector(currentSafeCurrentVersion)
  const connectedWalletAddress = useSelector(userAccountSelector)
  const chainId = useSelector(currentChainId)

  useEffect(
    () => () => {
      setActiveScreen('selectOracle')
      setValues({ oracleName: '', oracleAddress: '' })
    },
    [isOpen],
  )

  const onClickBack = () => {
    if (activeScreen === 'reviewAddOracle') {
      setActiveScreen('selectOracle')
    }
  }

  const oracleSubmitted = (newValues) => {
    setValues((stateValues) => ({
      ...stateValues,
      oracleName: newValues.oracleName,
      oracleAddress: newValues.oracleAddress,
    }))
    setActiveScreen('reviewAddOracle')
  }

  const onAddOracle = async (txParameters: TxParameters, delayExecution: boolean) => {
    onClose()

    try {
      await sendAddOracle(
        values,
        safeAddress,
        safeVersion,
        txParameters,
        dispatch,
        connectedWalletAddress,
        delayExecution,
        oracle,
      )
      dispatch(
        addressBookAddOrUpdate(
          makeAddressBookEntry({ name: values.oracleName, address: values.oracleAddress, chainId }),
        ),
      )
    } catch (error) {
      logError(Errors._808, error.message)
    }
  }

  return (
    <Modal
      description="Add oracle to Safe"
      handleClose={onClose}
      open={isOpen}
      paperClassName="bigger-modal-window"
      title="Add oracle to Safe"
    >
      <>
        {activeScreen === 'selectOracle' && (
          <OracleForm initialValues={values} onClose={onClose} onSubmit={oracleSubmitted} />
        )}
        {activeScreen === 'reviewAddOracle' && (
          <ReviewAddOracle onClickBack={onClickBack} onClose={onClose} onSubmit={onAddOracle} values={values} />
        )}
      </>
    </Modal>
  )
}
