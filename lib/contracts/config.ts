// ============ DriftLottery 抽奖合约 ABI ============
export const DRIFT_LOTTERY_ABI = [
  // --- 查询函数 ---
  {
    name: 'getRemainingTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getTotalPrizePool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getUserRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'getParticipantCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'currentRound',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'countdownEndTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'isParticipant',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'isDrawing',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'prizePool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'rolloverPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'marketingPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'token',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  },

  // --- 事件 ---
  {
    name: 'TradeReported',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'isBuy', type: 'bool', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'CountdownUpdated',
    type: 'event',
    inputs: [
      { name: 'newEndTime', type: 'uint256', indexed: false },
      { name: 'change', type: 'int256', indexed: false }
    ]
  },
  {
    name: 'DrawTriggered',
    type: 'event',
    inputs: [
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'prizePool', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'DrawExecuted',
    type: 'event',
    inputs: [
      { name: 'round', type: 'uint256', indexed: true }
    ]
  },
  {
    name: 'PrizeAwarded',
    type: 'event',
    inputs: [
      { name: 'round', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'prizeType', type: 'uint8', indexed: false }
    ]
  },
  {
    name: 'RoundReset',
    type: 'event',
    inputs: [
      { name: 'newRound', type: 'uint256', indexed: false },
      { name: 'rollover', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'TaxSynced',
    type: 'event',
    inputs: [
      { name: 'newTax', type: 'uint256', indexed: false },
      { name: 'poolShare', type: 'uint256', indexed: false },
      { name: 'marketingShare', type: 'uint256', indexed: false }
    ]
  }
] as const

// ============ flap.sh 代币 ABI（标准 ERC20 读取） ============
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false }
    ]
  }
] as const

// ============ PancakeSwap Router ABI ============
export const DEX_ROUTER_ABI = [
  {
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }]
  },
  {
    name: 'WETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  }
] as const

// ============ 合约地址配置 ============
// 部署后填入真实地址
export const CONTRACT_ADDRESSES: Record<number, {
  driftLottery: `0x${string}`   // 抽奖引擎合约
  flapToken: `0x${string}`      // flap.sh 创建的代币
  dexRouter: `0x${string}`      // PancakeSwap Router
  wbnb: `0x${string}`           // WBNB
}> = {
  // BSC 主网
  56: {
    driftLottery: '0x0000000000000000000000000000000000000000',  // 部署后填入
    flapToken: '0x0000000000000000000000000000000000000000',     // flap.sh 创建后填入
    dexRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',    // PancakeSwap V2
    wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  // BSC 测试网
  97: {
    driftLottery: '0x0000000000000000000000000000000000000000',  // 部署后填入
    flapToken: '0x0000000000000000000000000000000000000000',     // flap.sh 创建后填入
    dexRouter: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',    // PancakeSwap Testnet
    wbnb: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
  },
}

export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES
