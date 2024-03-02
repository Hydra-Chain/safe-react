import { ReactElement } from 'react'
import { ExplorerButton } from '@gnosis.pm/safe-react-components'
import styled from 'styled-components'

import Block from 'src/components/layout/Block'
import Img from 'src/components/layout/Img'
import Paragraph from 'src/components/layout/Paragraph'
import { setImageToPlaceholder } from 'src/routes/safe/components/Balances/utils'
import { BalanceData } from '../dataFetcher'
import { getNativeCurrencyAddress } from 'src/config/utils'
import { _getChainId } from '../../../../../config'

const StyledParagraph = styled(Paragraph)`
  margin-left: 10px;
  margin-right: 10px;
`

const AssetTableCell = ({ asset, safeAddress }: { asset: BalanceData['asset']; safeAddress: string }): ReactElement => {
  const isNativeCurrency = asset.address === getNativeCurrencyAddress()
  const url = `https://${_getChainId() === '2' ? 'test' : ''}explorer.hydrachain.org/contract/${safeAddress}`
  console.log('chainIDDDDDDDDDDDD', _getChainId())

  return (
    <Block justify="left">
      <Img alt={asset.name} height={26} onError={setImageToPlaceholder} src={asset.logoUri} />
      <StyledParagraph noMargin size="lg">
        {asset.name}
      </StyledParagraph>
      {!isNativeCurrency && <ExplorerButton explorerUrl={() => ({ url, alt: '' })} />}
    </Block>
  )
}

export default AssetTableCell
