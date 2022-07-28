import { useState, ReactElement } from 'react'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableRow from '@material-ui/core/TableRow'
import cn from 'classnames'

import { AddOwnerModal } from './AddOracleModal'
import { ORACLE_TABLE_ADDRESS_ID, generateColumns, getOracleData } from './dataFetcher'
import { useStyles } from './style'

import { getExplorerInfo } from 'src/config'
import Table from 'src/components/Table'
import { cellWidth } from 'src/components/Table/TableHead'
import Block from 'src/components/layout/Block'
import Button from 'src/components/layout/Button'
import Col from 'src/components/layout/Col'
import Hairline from 'src/components/layout/Hairline'
import Heading from 'src/components/layout/Heading'
import Paragraph from 'src/components/layout/Paragraph/index'
import Row from 'src/components/layout/Row'
import PrefixedEthHashInfo from 'src/components/PrefixedEthHashInfo'
import { AddressBookState } from 'src/logic/addressBook/model/addressBook'
import Track from 'src/components/Track'
import { SETTINGS_EVENTS } from 'src/utils/events/settings'

export const RENAME_ORACLE_BTN_TEST_ID = 'rename-oracle-btn'
export const ADD_ORACLE_BTN_TEST_ID = 'add-oracle-btn'
export const ORACLE_ROW_TEST_ID = 'oracle-row'

type Props = {
  granted: boolean
  oracle: AddressBookState
}

const ManageOracle = ({ granted, oracle }: Props): ReactElement => {
  const classes = useStyles()
  console.log('oracle', oracle)

  const [modalsStatus, setModalStatus] = useState({
    showAddOracle: false,
  })

  const onShow = (action) => () => {
    setModalStatus((prevState) => ({
      ...prevState,
      [`show${action}`]: !prevState[`show${action}`],
    }))
  }

  const onHide = (action) => () => {
    setModalStatus((prevState) => ({
      ...prevState,
      [`show${action}`]: !Boolean(prevState[`show${action}`]),
    }))
  }

  const columns = generateColumns()
  const autoColumns = columns.filter((c) => !c.custom)
  const oracleData = getOracleData(oracle)

  return (
    <>
      <Block className={classes.formContainer}>
        <Heading className={classes.title} tag="h2">
          Manage Safe Oracle
        </Heading>
        <Paragraph className={classes.annotation}>
          Add, remove and replace oracle or rename existing oracle. Oracle name is only stored locally and never shared
          with Gnosis or any third parties.
        </Paragraph>
        <TableContainer>
          <Table
            columns={columns}
            data={oracleData}
            defaultFixed
            defaultOrderBy={ORACLE_TABLE_ADDRESS_ID}
            disablePagination
            label="Oracle"
            noBorder
            size={oracleData.length}
          >
            {(sortedData) =>
              sortedData.map((row, index) => (
                <TableRow
                  className={cn(classes.hide, index >= 3 && index === sortedData.size - 1 && classes.noBorderBottom)}
                  data-testid={ORACLE_ROW_TEST_ID}
                  key={index}
                >
                  {autoColumns.map((column: any) => (
                    <TableCell align={column.align} component="td" key={column.id} style={cellWidth(column.width)}>
                      {column.id === ORACLE_TABLE_ADDRESS_ID ? (
                        <Block justify="left">
                          <PrefixedEthHashInfo
                            hash={row[column.id]}
                            showCopyBtn
                            showAvatar
                            explorerUrl={getExplorerInfo(row[column.id])}
                          />
                        </Block>
                      ) : (
                        row[column.id]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            }
          </Table>
        </TableContainer>
      </Block>
      {granted && (
        <>
          <Hairline />
          <Row align="end" className={classes.controlsRow} grow>
            <Col end="xs">
              <Track {...SETTINGS_EVENTS.ORACLE.ADD_ORACLE}>
                <Button
                  color="primary"
                  onClick={onShow('AddOracle')}
                  size="small"
                  testId={ADD_ORACLE_BTN_TEST_ID}
                  variant="contained"
                >
                  Add/Change Oracle
                </Button>
              </Track>
            </Col>
          </Row>
        </>
      )}
      <AddOwnerModal oracle={oracle[0].address} isOpen={modalsStatus.showAddOracle} onClose={onHide('AddOracle')} />
    </>
  )
}

export default ManageOracle
