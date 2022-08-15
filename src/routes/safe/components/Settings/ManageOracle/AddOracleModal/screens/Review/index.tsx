import { makeStyles } from '@material-ui/core/styles'
import { ReactElement, useEffect, useState, Fragment } from 'react'
import { useSelector } from 'react-redux'

import { getExplorerInfo } from 'src/config'
import Block from 'src/components/layout/Block'
import Col from 'src/components/layout/Col'
import Hairline from 'src/components/layout/Hairline'
import Paragraph from 'src/components/layout/Paragraph'
import Row from 'src/components/layout/Row'
import { userAccountSelector } from 'src/logic/wallets/store/selectors'
import PrefixedEthHashInfo from 'src/components/PrefixedEthHashInfo'
import { currentSafeWithNames } from 'src/logic/safe/store/selectors'
import { TxParameters } from 'src/routes/safe/container/hooks/useTransactionParameters'

import { OracleValues as OracleValues } from '../..'
import { styles } from './style'
import { ModalHeader } from 'src/routes/safe/components/Balances/SendModal/screens/ModalHeader'
import { Errors, logError } from 'src/logic/exceptions/CodedException'
import { TxModalWrapper } from 'src/routes/safe/components/Transactions/helpers/TxModalWrapper'
import { Overline } from 'src/components/layout/Typography'
import { getStepTitle } from 'src/routes/safe/components/Balances/SendModal/utils'
import { encodeMethodWithParams } from 'src/logic/hydra/contractInteractions/utils'
import { GnosisSafe } from 'src/logic/hydra/abis'

const useStyles = makeStyles(styles)

type ReviewAddOracleProps = {
  onClickBack: () => void
  onClose: () => void
  onSubmit: (txParameters: TxParameters, delayExecution: boolean | undefined) => void
  values: OracleValues
}

export const ReviewAddOracle = ({ onClickBack, onClose, onSubmit, values }: ReviewAddOracleProps): ReactElement => {
  const classes = useStyles()
  const [data, setData] = useState('')
  const {
    address: safeAddress,
    name: safeName,
    oracle,
    currentVersion: safeVersion,
  } = useSelector(currentSafeWithNames)
  const connectedWalletAddress = useSelector(userAccountSelector)

  useEffect(() => {
    let isCurrent = true

    const calculateAddOwnerData = async () => {
      try {
        const txData = encodeMethodWithParams(GnosisSafe, 'setOracle', ['0x' + values.oracleAddress])
        if (isCurrent) {
          setData(txData)
        }
      } catch (error) {
        logError(Errors._811, error.message)
      }
    }
    calculateAddOwnerData()

    return () => {
      isCurrent = false
    }
  }, [connectedWalletAddress, safeAddress, safeVersion, values])

  return (
    <TxModalWrapper txData={data} onSubmit={onSubmit} onBack={onClickBack}>
      <ModalHeader onClose={onClose} title="Add new owner" subTitle={getStepTitle(2, 2)} />
      <Hairline />
      <Block margin="md">
        <Row className={classes.root}>
          <Col layout="column" xs={4}>
            <Block className={classes.details}>
              <Block margin="lg">
                <Paragraph color="primary" noMargin size="lg">
                  Details
                </Paragraph>
              </Block>
              <Block margin="lg">
                <Paragraph color="disabled" noMargin size="sm">
                  Safe name
                </Paragraph>
                <Paragraph className={classes.name} color="primary" noMargin size="lg" weight="bolder">
                  {safeName}
                </Paragraph>
              </Block>
              <Block margin="lg">
                <Paragraph color="disabled" noMargin size="sm">
                  Any transaction requires the confirmation of:
                </Paragraph>
              </Block>
            </Block>
          </Col>
          <Col className={classes.owners} layout="column" xs={8}>
            <Row className={classes.ownersTitle}>
              <Paragraph color="primary" noMargin size="lg">
                {`${(oracle?.length || 0) + 1} Safe owner(s)`}
              </Paragraph>
            </Row>
            <Hairline />

            {oracle?.map((o) => (
              <Fragment key={o.address}>
                <Row className={o.name}>
                  <Col align="center" xs={12}>
                    <PrefixedEthHashInfo
                      hash={o.address}
                      name={o.name}
                      showCopyBtn
                      showAvatar
                      explorerUrl={getExplorerInfo(o.address)}
                    />
                  </Col>
                </Row>
                <Hairline />
              </Fragment>
            ))}
            <Row align="center" className={classes.info}>
              <Overline noMargin>ADDING NEW OWNER &darr;</Overline>
            </Row>
            <Hairline />
            <Row className={classes.selectedOwner} data-testid="add-owner-review">
              <Col align="center" xs={12}>
                <PrefixedEthHashInfo
                  hash={values.oracleAddress}
                  name={values.oracleName}
                  showCopyBtn
                  showAvatar
                  explorerUrl={getExplorerInfo(values.oracleAddress)}
                />
              </Col>
            </Row>
            <Hairline />
          </Col>
        </Row>
        <Hairline />
      </Block>
    </TxModalWrapper>
  )
}
