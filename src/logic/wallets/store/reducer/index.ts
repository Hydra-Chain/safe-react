import { Action, handleActions } from 'redux-actions'

import { ChainId } from 'src/config/chain.d'
import { PROVIDER_ACTIONS } from 'src/logic/wallets/store/actions'

export type ProvidersState = {
  name: string
  network: ChainId
  account: string
  available: boolean
  ensDomain: string
  loaded: boolean
  hydraSDK: any
  hydraAccount: any
}

export type ProviderNamePayload = ProvidersState['name']
export type ProviderNetworkPayload = ProvidersState['network']
export type ProviderAccountPayload = ProvidersState['account']
export type ProviderEnsPayload = ProvidersState['ensDomain']
export type ProviderHydraSDKPayload = ProvidersState['hydraSDK']
export type ProviderHydraAccountPayload = ProvidersState['hydraAccount']

export type ProviderPayloads =
  | ProviderNamePayload
  | ProviderAccountPayload
  | ProviderNetworkPayload
  | ProviderEnsPayload
  | ProviderHydraSDKPayload
  | ProviderHydraAccountPayload

const initialProviderState: ProvidersState = {
  name: '',
  account: '',
  network: '',
  ensDomain: '',
  available: false,
  loaded: false,
  hydraSDK: null,
  hydraAccount: null,
}

export const PROVIDER_REDUCER_ID = 'providers'

const providerFactory = (provider: ProvidersState) => {
  const { name, account, network } = provider
  return {
    ...provider,
    available: !!account,
    loaded: !!account && !!name && !!network,
  }
}

const providerReducer = handleActions<ProvidersState, ProviderPayloads>(
  {
    [PROVIDER_ACTIONS.WALLET_NAME]: (state: ProvidersState, { payload }: Action<ProviderNamePayload>) =>
      providerFactory({
        ...state,
        name: payload,
      }),
    [PROVIDER_ACTIONS.NETWORK]: (state: ProvidersState, { payload }: Action<ProviderNetworkPayload>) =>
      providerFactory({
        ...state,
        network: payload,
      }),
    [PROVIDER_ACTIONS.ACCOUNT]: (state: ProvidersState, { payload }: Action<ProviderAccountPayload>) =>
      providerFactory({
        ...state,
        account: payload,
      }),
    [PROVIDER_ACTIONS.ENS]: (state: ProvidersState, { payload }: Action<ProviderEnsPayload>) =>
      providerFactory({
        ...state,
        ensDomain: payload,
      }),
    [PROVIDER_ACTIONS.HYDRA_SDK]: (state: ProvidersState, { payload }: Action<ProviderHydraSDKPayload>) =>
      providerFactory({
        ...state,
        hydraSDK: payload,
      }),
    [PROVIDER_ACTIONS.HYDRA_ACCOUNT]: (state: ProvidersState, { payload }: Action<ProviderHydraAccountPayload>) =>
      providerFactory({
        ...state,
        hydraAccount: payload,
      }),
  },
  initialProviderState,
)

export default providerReducer
