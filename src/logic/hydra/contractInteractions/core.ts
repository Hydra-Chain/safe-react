export const getContract = (lib: any, contractAddress: string, abi: any): any => {
  const contract = lib.Contract(contractAddress, abi)
  return contract
}

export const contractCall = async (
  contract: any,
  method: string,
  methodArgs: any[],
  senderAddress: string,
): Promise<any> => {
  const tx = await contract.call(method, {
    methodArgs,
    senderAddress,
  })
  return tx
}

export const contractSend = async (
  contract: any,
  method: string,
  methodArgs: any[],
  senderAddress: string,
  gasLimit = 250000,
  amountHYDRA = 0,
): Promise<any> => {
  const tx = await contract.send(method, {
    methodArgs,
    gasLimit,
    senderAddress,
    amount: amountHYDRA,
  })
  return tx
}
