import { hexFieldsToNumber } from './utils'
import type {
  TransactionForSim,
  TransactionPreviewInitOptions
} from './types.js'
import type { MultiSimOutput } from 'bnc-sdk'
import { ethers } from 'ethers'

const simulateTransactions = async (
  options: Omit<TransactionPreviewInitOptions, 'provider'>,
  transactions: TransactionForSim[]
): Promise<MultiSimOutput> => {
  const { sdk } = options
  const cleanedTransactions: TransactionForSim[] = transactions.map(
    transaction => {
      const convertedTransaction = hexFieldsToNumber(
        transaction as TransactionForSim
      )
      const cleanedTrans = {
        from: convertedTransaction.from,
        to: convertedTransaction.to,
        gas: convertedTransaction.gas,
        gasPrice: convertedTransaction.gasPrice,
        maxFeePerGas: convertedTransaction.maxFeePerGas,
        maxPriorityFeePerGas: convertedTransaction.maxPriorityFeePerGas,
        input:
          convertedTransaction.input ||
          transaction.input ||
          transaction.data ||
          '0x',
        value: convertedTransaction.value
      }
      return cleanedTrans
    }
  )
  const addressFrom = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const CONTRACT_ADDRESS = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
  const erc20_interface = [
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
    'function balanceOf(address owner) view returns (uint256)'
  ]
  const uniswapV2router_interface = [
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
  ]
  const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  const dai = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  let swapTxData
  let approveTxData
  const createTransaction = async () => {
    const swapContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      uniswapV2router_interface
    )
    const erc20_contract = new ethers.Contract(weth, erc20_interface)
    const oneEther = ethers.BigNumber.from('1591000000000000000000')
    approveTxData = await erc20_contract.populateTransaction.approve(
      CONTRACT_ADDRESS,
      oneEther
    )
    const amountOutMin = 0
    const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString())._hex
    const path = [dai, weth]
    const deadline = Math.floor(Date.now() / 1000) + 60 * 1 // 1 minutes from the current Unix time
    const inputAmountHex = oneEther.toHexString()
    swapTxData = await swapContract.populateTransaction.swapExactTokensForETH(
      inputAmountHex,
      amountOutMinHex,
      path,
      addressFrom,
      deadline
    )
  }
  await createTransaction()
  const account_address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const uniswapV2Router = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
  const stubTrans = [
    {
      from: account_address,
      to: dai,
      input: approveTxData.data,
      gas: 1000000,
      gasPrice: 48000000000,
      value: 0
    },
    {
      from: account_address,
      to: uniswapV2Router,
      input: swapTxData.data,
      gas: 1000000,
      gasPrice: 48000000000,
      value: 0
    }
  ]
  return sdk.multiSim(stubTrans) as Promise<MultiSimOutput>
}

export default simulateTransactions
