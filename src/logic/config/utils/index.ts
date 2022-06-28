import { ChainId } from 'src/config/chain.d'
import { store } from 'src/store'
import { setChainIdAction } from 'src/logic/config/store/actions'
import { _setChainId } from 'src/config'

export const setChainId = (newChainId: ChainId) => {
  newChainId = '1'
  _setChainId(newChainId)
  store.dispatch(setChainIdAction(newChainId))
}
