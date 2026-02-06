/**
 * 读取 flap.sh 代币的 mainPool（DEX Pair 地址）和状态
 */
const hre = require("hardhat");

async function main() {
  const TOKEN = "0x71b50c85b9ce106a44bc33059d22a149b0d37777";
  const LOTTERY = "0x697e0f30BBa4f07fE9450ad517cE0d95f925bdb9";

  const token = await hre.ethers.getContractAt([
    "function mainPool() view returns (address)",
    "function state() view returns (uint8)",
    "function taxRate() view returns (uint16)",
    "function taxSplitter() view returns (address)",
    "function symbol() view returns (string)",
    "function QUOTE_TOKEN() view returns (address)",
  ], TOKEN);

  const symbol = await token.symbol();
  const mainPool = await token.mainPool();
  const state = await token.state();
  const taxRate = await token.taxRate();
  const taxSplitter = await token.taxSplitter();
  const quoteToken = await token.QUOTE_TOKEN();

  const stateNames = ["BondingCurve", "Migrating", "TaxEnforcedAntiFarmer", "TaxEnforced", "TaxFree"];

  console.log("========================================");
  console.log(`  ${symbol} 代币信息`);
  console.log("========================================");
  console.log("代币地址:", TOKEN);
  console.log("DEX Pair (mainPool):", mainPool);
  console.log("状态:", stateNames[state] || state);
  console.log("税率:", Number(taxRate) / 100, "%");
  console.log("taxSplitter (中间合约):", taxSplitter);
  console.log("Lottery 合约:", LOTTERY);
  console.log("💡 注意: flap.sh 会创建中间 taxSplitter 合约，再转发 BNB 到你设置的收款地址（Lottery）");
  console.log("Quote Token:", quoteToken);
  console.log("");

  if (state === 0n) {
    console.log("⚠️  代币还在 BondingCurve 阶段（内盘交易）");
    console.log("   需要等 flap.sh 毕业后才会上 PancakeSwap");
    console.log("   毕业后 DEX Pair 才会有交易");
  } else {
    console.log("✅ 代币已上 DEX，Pair 地址可用于 Keeper 监控");
  }
}

main().catch(console.error);
