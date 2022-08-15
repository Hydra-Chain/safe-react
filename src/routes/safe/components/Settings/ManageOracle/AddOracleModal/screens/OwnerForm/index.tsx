import { makeStyles } from '@material-ui/core/styles'
import { Mutator } from 'final-form'

import { useSelector } from 'react-redux'
import { OnChange } from 'react-final-form-listeners'

import { styles } from './style'

import { ScanQRWrapper } from 'src/components/ScanQRModal/ScanQRWrapper'
import AddressInput from 'src/components/forms/AddressInput'
import Field from 'src/components/forms/Field'
import GnoForm from 'src/components/forms/GnoForm'
import TextField from 'src/components/forms/TextField'
import {
  addressIsNotCurrentSafe,
  composeValidators,
  required,
  uniqueAddress,
  validAddressBookName,
} from 'src/components/forms/validator'
import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import Row from 'src/components/layout/Row'
import { currentNetworkAddressBookAsMap } from 'src/logic/addressBook/store/selectors'
import { currentSafe } from 'src/logic/safe/store/selectors'
import { isValidAddressHydraHex } from 'src/utils/isValidAddress'

import { OracleValues as OracleValues } from '../..'
import { Modal } from 'src/components/Modal'
import { ModalHeader } from 'src/routes/safe/components/Balances/SendModal/screens/ModalHeader'
import { getStepTitle } from 'src/routes/safe/components/Balances/SendModal/utils'

export const ADD_ORACLE_NAME_INPUT_TEST_ID = 'add-oracle-name-input'
export const ADD_ORACLE_ADDRESS_INPUT_TEST_ID = 'add-oracle-address-testid'
export const ADD_ORACLE_NEXT_BTN_TEST_ID = 'add-oracle-next-btn'

const formMutators: Record<
  string,
  Mutator<{ setOracleAddress: { address: string }; setOracleName: { name: string } }>
> = {
  setOracleAddress: (args, state, utils) => {
    utils.changeValue(state, 'oracleAddress', () => args[0])
  },
  setOracleName: (args, state, utils) => {
    utils.changeValue(state, 'oracleName', () => args[0])
  },
}

const useStyles = makeStyles(styles)

type OracleFormProps = {
  onClose: () => void
  onSubmit: (values) => void
  initialValues?: OracleValues
}

export const OracleForm = ({ onClose, onSubmit, initialValues }: OracleFormProps): React.ReactElement => {
  const classes = useStyles()
  const handleSubmit = (values) => {
    onSubmit(values)
  }
  const addressBookMap = useSelector(currentNetworkAddressBookAsMap)
  const { address: safeAddress = '', oracle = [] } = useSelector(currentSafe)
  const oracleDoesntExist = uniqueAddress(oracle)
  const oracleAddressIsNotSafeAddress = addressIsNotCurrentSafe(safeAddress)

  return (
    <>
      <ModalHeader onClose={onClose} title="Add oracle" subTitle={getStepTitle(1, 2)} />
      <Hairline />
      <GnoForm
        formMutators={formMutators}
        initialValues={{
          oracleName: initialValues?.oracleName,
          oracleAddress: initialValues?.oracleAddress,
        }}
        onSubmit={handleSubmit}
      >
        {(...args) => {
          const mutators = args[3]

          const handleScan = (value, closeQrModal) => {
            let scannedAddress = value

            if (scannedAddress.startsWith('ethereum:')) {
              scannedAddress = scannedAddress.replace('ethereum:', '')
            }
            mutators.setOracleAddress(scannedAddress)
            closeQrModal()
          }

          return (
            <>
              <Block className={classes.formContainer}>
                <Row margin="md">
                  <Paragraph>Add a oracle to the active Safe</Paragraph>
                </Row>
                <Row margin="md">
                  <Col xs={8}>
                    <Field
                      component={TextField}
                      name="oracleName"
                      placeholder="Oracle name*"
                      testId={ADD_ORACLE_NAME_INPUT_TEST_ID}
                      label="Oracle name*"
                      type="text"
                      validate={composeValidators(required, validAddressBookName)}
                    />
                    <OnChange name="oracleAddress">
                      {async (address: string) => {
                        if (isValidAddressHydraHex(address)) {
                          const oracleName = addressBookMap[address]?.name
                          if (oracleName) {
                            mutators.setOracleName(oracleName)
                          }
                        }
                      }}
                    </OnChange>
                  </Col>
                </Row>
                <Row margin="md">
                  <Col xs={8}>
                    <AddressInput
                      fieldMutator={mutators.setOracleAddress}
                      name="oracleAddress"
                      placeholder="Oracle address*"
                      testId={ADD_ORACLE_ADDRESS_INPUT_TEST_ID}
                      text="Oracle address*"
                      validators={[oracleDoesntExist, oracleAddressIsNotSafeAddress]}
                    />
                  </Col>
                  <Col center="xs" className={classes} middle="xs" xs={1}>
                    <ScanQRWrapper handleScan={handleScan} />
                  </Col>
                </Row>
              </Block>
              <Hairline />
              <Row align="center" className={classes.buttonRow}>
                <Modal.Footer.Buttons
                  cancelButtonProps={{ onClick: onClose, text: 'Cancel' }}
                  confirmButtonProps={{
                    type: 'submit',
                    text: 'Next',
                    testId: ADD_ORACLE_NEXT_BTN_TEST_ID,
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
