import { createAction } from 'redux-actions'

import { PROVIDER_ACTIONS } from 'src/logic/wallets/store/actions'
import { ProviderHydraAccountPayload } from 'src/logic/wallets/store/reducer'

const updateProviderHydraAccount = createAction<ProviderHydraAccountPayload>(PROVIDER_ACTIONS.HYDRA_ACCOUNT)

export default updateProviderHydraAccount
