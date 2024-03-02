import { makeStyles } from '@material-ui/core/styles'
import { Dispatch, ReactElement } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { styles } from './style'
import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import Row from 'src/components/layout/Row'
import { AddressBookEntry } from 'src/logic/addressBook/model/addressBook'
import { currentChainId } from 'src/logic/config/store/selectors'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import { composeValidators, minValue, mustBeEthereumAddress, mustBeFloat } from 'src/components/forms/validator'
import AddressInput from 'src/components/forms/AddressInput'
import { Mutator } from 'final-form'
import GnoForm from 'src/components/forms/GnoForm'
import { Field } from '../Settings/SpendingLimit/FormFields/Amount'
import TextField from 'src/components/forms/TextField'
import { InputAdornment } from '@material-ui/core'
import { Modal } from 'src/components/Modal'
import { encodeMethodWithParams } from 'src/logic/hydra/contractInteractions/utils'
import useSafeAddress from 'src/logic/currentSession/hooks/useSafeAddress'
import { DepositHydraToSafe } from 'src/logic/hydra/abis'
import { createTransaction } from 'src/logic/safe/store/actions/createTransaction'
import { TX_NOTIFICATION_TYPES } from 'src/logic/safe/transactions'
import { currentSafeWithNames } from 'src/logic/safe/store/selectors'
import { getDepositToSafeAddress } from 'src/logic/hydra/contracts'
import { _getChainId } from '../../../../config'

const useStyles = makeStyles(styles)

export const RECEPIENT_ADDRESS_INPUT_TEST_ID = 'recepient-address-testid'

interface AddressBookSelectedEntry extends AddressBookEntry {
  isNew?: boolean
}

const formMutators: Record<
  string,
  Mutator<{ setRecepientAddress: { address: string }; setAmount: { amount: string } }>
> = {
  setRecepientAddress: (args, state, utils) => {
    utils.changeValue(state, 'recepientAddress', () => args[0])
  },
  setAmount: (args, state, utils) => {
    utils.changeValue(state, 'amount', () => args[0])
  },
}

export type DepositValues = {
  recepient: AddressBookSelectedEntry
  amount: string
  isOwnerAddress?: boolean
}

interface SendDepositParams {
  safeAddress: string
  dispatch: Dispatch<any>
  safeNonce: string | number
  amount: string
}

const sendDeposit = ({ safeAddress, amount, dispatch, safeNonce }: SendDepositParams) => {
  const txData = encodeMethodWithParams(DepositHydraToSafe, 'depositAndTransfer', ['0x' + safeAddress])
  dispatch(
    createTransaction(
      {
        safeAddress,
        to: getDepositToSafeAddress(_getChainId()),
        valueInWei: amount,
        txData,
        txNonce: safeNonce,
        safeTxGas: '60000',
        // ethParameters: txParameters,
        notifiedTransaction: TX_NOTIFICATION_TYPES.STANDARD_TX,
        delayExecution: false,
      },
      undefined,
      undefined,
      undefined,
      undefined,
      { recepient: safeAddress, amount },
    ),
  )
}

const Deposit = (): ReactElement => {
  const { safeAddress } = useSafeAddress()
  const classes = useStyles()
  const dispatch = useDispatch()
  const { nonce } = useSelector(currentSafeWithNames)
  const chainId = useSelector(currentChainId)
  const recepient: AddressBookSelectedEntry = { address: safeAddress, chainId, name: '' }

  const handleDepositHYDRAToSafe = (recepient: AddressBookSelectedEntry, amount: string) => {
    sendDeposit({ safeAddress: recepient.address, amount, dispatch, safeNonce: nonce })
  }

  return (
    <>
      <Hairline />
      <GnoForm
        formMutators={formMutators}
        initialValues={{
          recepient: recepient,
          amount: '',
        }}
        onSubmit={() => {}}
      >
        {(...args) => {
          const mutators = args[3]
          const { recepient, amount } = args[2].values
          return (
            <>
              <Block className={classes.formContainer}>
                <Row margin="md">
                  <Paragraph>Deposit HYDRA main currency</Paragraph>
                </Row>
                <Row margin="md">
                  <Col xs={8}>
                    <AddressInput
                      fieldMutator={mutators.setRecepientAddress}
                      name="recepientAddress"
                      placeholder="Recepient address*"
                      testId={RECEPIENT_ADDRESS_INPUT_TEST_ID}
                      text="Recepient address*"
                      validators={[mustBeEthereumAddress]}
                    />
                  </Col>
                </Row>
                <Row margin="md">
                  <Col xs={8} style={{ display: 'flex', flexDirection: 'column' }}>
                    <Paragraph color="disabled" noMargin size="md">
                      Amount
                      <span>(Min amount to deposit is 1 HYDRA)</span>
                    </Paragraph>
                    <Field
                      component={TextField}
                      inputAdornment={{
                        endAdornment: <InputAdornment position="end">HYDRA</InputAdornment>,
                      }}
                      name="amount"
                      placeholder="Amount"
                      type="text"
                      validate={composeValidators(mustBeFloat, minValue(1))}
                    />
                  </Col>
                </Row>
                <Row margin="md">
                  <Col xs={8} />
                </Row>
              </Block>
              <Hairline />
              <Row align="center" className={classes.buttonRow}>
                <Modal.Footer.Buttons
                  cancelButtonProps={{
                    onClick: () => {},
                    text: 'Cancel',
                  }}
                  confirmButtonProps={{
                    type: 'submit',
                    text: 'Submit',
                    onClick: () => handleDepositHYDRAToSafe(recepient, amount),
                  }}
                />
              </Row>
            </>
          )
        }}
      </GnoForm>
    </>
  )
}

export default Deposit
