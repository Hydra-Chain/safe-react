import { createAction } from 'redux-actions'

import { PROVIDER_ACTIONS } from 'src/logic/wallets/store/actions'
import { ProviderHydraSDKPayload } from 'src/logic/wallets/store/reducer'

const updateProviderHydraSDK = createAction<ProviderHydraSDKPayload>(PROVIDER_ACTIONS.HYDRA_SDK)

export default updateProviderHydraSDK
