import { List } from 'immutable'

import { TableColumn } from 'src/components/Table/types.d'
import { AddressBookState } from 'src/logic/addressBook/model/addressBook'

export const ORACLE_TABLE_NAME_ID = 'name'
export const ORACLE_TABLE_ADDRESS_ID = 'address'

export type OracleData = { address: string; name: string }

export const getOracleData = (oracle: AddressBookState): OracleData[] => {
  return oracle.map((o) => ({
    [ORACLE_TABLE_NAME_ID]: o.name,
    [ORACLE_TABLE_ADDRESS_ID]: o.address,
  }))
}

export const generateColumns = (): List<TableColumn> => {
  const nameColumn: TableColumn = {
    id: ORACLE_TABLE_NAME_ID,
    order: false,
    formatTypeSort: (value: string) => value.toLowerCase(),
    disablePadding: false,
    label: 'Name',
    width: 150,
    custom: false,
    align: 'left',
  }

  const addressColumn: TableColumn = {
    id: ORACLE_TABLE_ADDRESS_ID,
    order: false,
    disablePadding: false,
    label: 'Address',
    custom: false,
    align: 'left',
  }

  return List([nameColumn, addressColumn])
}
