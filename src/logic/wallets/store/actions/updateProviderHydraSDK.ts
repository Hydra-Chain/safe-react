import { createAction } from 'redux-actions'

import { PROVIDER_ACTIONS } from 'src/logic/wallets/store/actions'
import { ProviderHydraSDK } from 'src/logic/wallets/store/reducer'

const updateProviderHydraSDK = createAction<ProviderHydraSDK>(PROVIDER_ACTIONS.HYDRA_SDK)

export default updateProviderHydraSDK
