/**
 * DriftLottery Keeper 脚本
 *
 * 功能：
 *   1. 监听 PancakeSwap 上 flap.sh 代币的交易事件
 *   2. 判断买/卖方向
 *   3. 调用 DriftLottery.reportTrade() 报告交易
 *   4. 在倒计时到期时自动触发开奖
 *
 * 使用方式：
 *   1. 复制 .env.example 为 .env，填入配置
 *   2. node scripts/keeper.js
 *
 * 需要的环境变量：
 *   RPC_URL           - BSC RPC 地址
 *   KEEPER_PRIVATE_KEY - Keeper 钱包私钥
 *   LOTTERY_ADDRESS    - DriftLottery 合约地址
 *   TOKEN_ADDRESS      - flap.sh 代币地址
 *   DEX_PAIR_ADDRESS   - PancakeSwap 交易对地址
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ====== 配置 ======
const config = {
  rpcUrl: process.env.RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
  keeperKey: process.env.KEEPER_PRIVATE_KEY,
  lotteryAddress: process.env.LOTTERY_ADDRESS,
  tokenAddress: process.env.TOKEN_ADDRESS,
  dexPairAddress: process.env.DEX_PAIR_ADDRESS,
  pollInterval: 5000, // 5秒轮询
};

// ====== ABI ======
const LOTTERY_ABI = [
  "function reportTrade(address trader, bool isBuy, uint256 amount) external",
  "function triggerDraw() external",
  "function executeDraw() external",
  "function countdownEndTime() view returns (uint256)",
  "function isDrawing() view returns (bool)",
  "function drawBlock() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function syncTax() external",
];

// PancakeSwap Pair 的 Swap 事件
const PAIR_ABI = [
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
];

// ERC20 Transfer 事件
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ====== 主逻辑 ======
async function main() {
  console.log("========================================");
  console.log("  DriftLottery Keeper");
  console.log("========================================");

  // 校验配置
  if (!config.keeperKey) {
    console.error("❌ 请设置 KEEPER_PRIVATE_KEY 环境变量");
    process.exit(1);
  }
  if (!config.lotteryAddress) {
    console.error("❌ 请设置 LOTTERY_ADDRESS 环境变量");
    process.exit(1);
  }
  if (!config.tokenAddress) {
    console.error("❌ 请设置 TOKEN_ADDRESS 环境变量");
    process.exit(1);
  }
  if (!config.dexPairAddress) {
    console.error("❌ 请设置 DEX_PAIR_ADDRESS 环境变量");
    process.exit(1);
  }

  // 连接
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const keeper = new ethers.Wallet(config.keeperKey, provider);
  const lottery = new ethers.Contract(config.lotteryAddress, LOTTERY_ABI, keeper);
  const pair = new ethers.Contract(config.dexPairAddress, PAIR_ABI, provider);
  const token = new ethers.Contract(config.tokenAddress, ERC20_ABI, provider);

  console.log("Keeper 地址:", keeper.address);
  console.log("Lottery 合约:", config.lotteryAddress);
  console.log("代币地址:", config.tokenAddress);
  console.log("DEX Pair:", config.dexPairAddress);
  console.log("");

  // ====== 监听 DEX Swap 事件 ======
  console.log("🔍 开始监听 DEX 交易...");

  pair.on("Swap", async (sender, amount0In, amount1In, amount0Out, amount1Out, to) => {
    try {
      // 判断买/卖方向
      // PancakeSwap Pair: token0/token1 排序取决于地址大小
      // 如果代币作为 token0：amount0Out > 0 = 买入, amount0In > 0 = 卖出
      // 如果代币作为 token1：amount1Out > 0 = 买入, amount1In > 0 = 卖出
      // 简化判断：看 Transfer 事件中代币的流向

      // 获取交易者地址
      const trader = to; // Swap 的 to 地址就是接收者

      // 判断方向：如果 to 是 pair 地址，说明代币流入 pair = 卖出
      // 如果 to 不是 pair 地址，说明代币流出 pair = 买入
      const isBuy = to.toLowerCase() !== config.dexPairAddress.toLowerCase();

      // 获取交易量
      const amount = isBuy
        ? (amount0Out > 0n ? amount0Out : amount1Out)
        : (amount0In > 0n ? amount0In : amount1In);

      console.log(`📊 检测到交易: ${isBuy ? "买入" : "卖出"} | 交易者: ${trader} | 数量: ${ethers.formatEther(amount)}`);

      // 报告给合约
      const tx = await lottery.reportTrade(trader, isBuy, amount);
      console.log(`  ✅ reportTrade tx: ${tx.hash}`);
      await tx.wait();
      console.log(`  ✅ 已确认`);
    } catch (error) {
      console.error(`  ❌ reportTrade 失败:`, error.message);
    }
  });

  // ====== 定期检查倒计时 & 开奖 ======
  console.log("⏰ 开始定期检查倒计时...");

  setInterval(async () => {
    try {
      const isDrawing = await lottery.isDrawing();
      const countdownEnd = await lottery.countdownEndTime();
      const now = BigInt(Math.floor(Date.now() / 1000));

      if (isDrawing) {
        // 正在开奖状态，尝试执行开奖
        const drawBlock = await lottery.drawBlock();
        const currentBlock = await provider.getBlockNumber();

        if (currentBlock > Number(drawBlock) + 2) {
          console.log("🎰 执行开奖...");
          try {
            const tx = await lottery.executeDraw();
            console.log(`  ✅ executeDraw tx: ${tx.hash}`);
            await tx.wait();
            console.log(`  🎉 开奖完成！`);
          } catch (error) {
            console.error(`  ❌ executeDraw 失败:`, error.message);
          }
        } else {
          console.log(`  ⏳ 等待区块确认... (当前: ${currentBlock}, 需要: > ${Number(drawBlock) + 2})`);
        }
      } else if (now >= countdownEnd) {
        // 倒计时到期，触发开奖
        console.log("⏰ 倒计时到期，触发开奖...");
        try {
          // 先同步税收
          const syncTx = await lottery.syncTax();
          await syncTx.wait();

          const tx = await lottery.triggerDraw();
          console.log(`  ✅ triggerDraw tx: ${tx.hash}`);
          await tx.wait();
          console.log(`  ✅ 开奖已触发，等待区块确认...`);
        } catch (error) {
          console.error(`  ❌ triggerDraw 失败:`, error.message);
        }
      } else {
        const remaining = Number(countdownEnd - now);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        // 每30秒打印一次状态
        if (remaining % 30 < 6) {
          const round = await lottery.currentRound();
          console.log(`  ⏱️  轮次 #${round} | 剩余: ${mins}m ${secs}s`);
        }
      }
    } catch (error) {
      console.error("状态检查错误:", error.message);
    }
  }, config.pollInterval);

  // 保持进程运行
  console.log("");
  console.log("✅ Keeper 正在运行...");
  console.log("   按 Ctrl+C 停止");
}

main().catch((error) => {
  console.error("Keeper 启动失败:", error);
  process.exit(1);
});
