import { Hydraweb3 } from 'hydraweb3-js'
import { useState, useEffect } from 'react'
import { store } from 'src/store'
import closeSnackbar from '../notifications/store/actions/closeSnackbar'
import updateProviderAccount from '../wallets/store/actions/updateProviderAccount'
import updateProviderNetwork from '../wallets/store/actions/updateProviderNetwork'
import updateProviderWallet from '../wallets/store/actions/updateProviderWallet'
// import invoke from '../hydra/mobileInvoke/browser'

// const rawCall = invoke.bind('rawCall')

declare global {
  interface Window {
    hydrawallet: any
    ReactNativeWebView: any
  }
}

export default function (): { account: any; hydraSDK: any; error: string } {
  const [account, setAccount] = useState()
  const [hydraSDK, setHydraSDK] = useState()
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.hydrawallet) {
      return
    }
    console.log(' in use hydra')

    window.addEventListener(
      'message',
      function handleHydrawalletInstalledOrUpdated(event) {
        if (event.data.message && event.data.message.type === 'HYDRAWALLET_INSTALLED_OR_UPDATED') {
          // Refresh the page
          window.location.reload()
        }
      },
      false,
    )

    window.addEventListener(
      'message',
      function handleHydrawalletAcctChanged(event) {
        if (event.data.message && event.data.message.type === 'HYDRAWALLET_ACCOUNT_CHANGED') {
          if (event.data.message.payload.error) {
            // handle error
            setError(event.data.message.payload.error)
          }
          setError('')
          // should be in state where wallet or contract functions are used
          const account = event.data.message.payload.account
          const hydraExtension = new Hydraweb3(window.hydrawallet.rpcProvider)
          store.dispatch(updateProviderWallet(account?.name || ''))
          store.dispatch(updateProviderAccount(account?.address || ''))
          store.dispatch(updateProviderNetwork(account ? '1' : ''))
          store.dispatch(closeSnackbar({ dismissAll: true }))
          //   const hydraExtension = new Hydraweb3(window.ReactNativeWebView ? { rawCall } : window.hydrawallet.rpcProvider)
          setAccount(account)
          setHydraSDK(hydraExtension)
        }
      },
      false,
    )

    // Handle incoming messages
    window.addEventListener(
      'message',
      function handleMessage(message) {
        if (message.data.target === 'hydrawallet-inpage') {
          // result: object
          // error: string
          //   const { result, error } = message.data.message.payload
          const { error } = message.data.message.payload
          if (error) {
            if (error === 'Not logged in. Please log in to hydrawallet first.') {
              // Show an alert dialog that the user needs to login first
            } else {
              // Handle different error than not logged in...
            }
            return
          }

          if (message?.data?.payload?.statusChangeReason === 'Account Logged Out') {
            window.postMessage({ message: { type: 'CONNECT_HYDRAWALLET' } }, '')
          }
          // Do something with the message result...
        }
      },
      false,
    )
  }, [])

  return { account, hydraSDK, error }
}
