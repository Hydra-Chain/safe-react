import { createAction } from 'redux-actions'

export const ADD_CURRENT_SAFE_ADDRESS = 'ADD_CURRENT_SAFE_ADDRESS'
export const ADD_CURRENT_SAFE_ADDRESS_HYDRA = 'ADD_CURRENT_SAFE_ADDRESS_HYDRA'

const addCurrentSafeAddress = createAction<string>(ADD_CURRENT_SAFE_ADDRESS)
// const addCurrentSafeAddressHydra = createAction<string>(ADD_CURRENT_SAFE_ADDRESS_HYDRA)

export default addCurrentSafeAddress
