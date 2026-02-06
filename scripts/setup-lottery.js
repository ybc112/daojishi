/**
 * 配置新部署的 DriftLottery v2 合约
 * 
 * 使用方式：
 *   npx hardhat run scripts/setup-lottery.js --network bsc
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // ====== 配置（根据实际情况修改） ======
  const LOTTERY_ADDRESS = process.env.LOTTERY_ADDRESS || "0x697e0f30BBa4f07fE9450ad517cE0d95f925bdb9";
  const FLAP_TOKEN = "0x71b50c85b9ce106a44bc33059d22a149b0d37777";
  const KEEPER_ADDRESS = "0xcb6bd4dAa6afA2c09A78FAC8C35E1c4923128F30";

  console.log("========================================");
  console.log("  配置 DriftLottery v3");
  console.log("========================================");
  console.log("合约地址:", LOTTERY_ADDRESS);
  console.log("操作者:", deployer.address);
  console.log("");

  const lottery = await hre.ethers.getContractAt("DriftLottery", LOTTERY_ADDRESS);

  // 1. 设置 flap.sh 代币地址（用于持仓检查）
  console.log("1️⃣  设置 Token (flap.sh 代币)...");
  const tx1 = await lottery.setToken(FLAP_TOKEN);
  await tx1.wait();
  console.log("   ✅ setToken 完成:", tx1.hash);

  // 2. 设置 Keeper 地址
  console.log("2️⃣  设置 Keeper...");
  const tx2 = await lottery.setKeeper(KEEPER_ADDRESS);
  await tx2.wait();
  console.log("   ✅ setKeeper 完成:", tx2.hash);

  // 3. 验证配置
  console.log("\n========================================");
  console.log("  验证配置");
  console.log("========================================");
  const token = await lottery.token();
  const keeper = await lottery.keeper();
  const countdown = await lottery.countdownEndTime();
  const bnbBalance = await hre.ethers.provider.getBalance(LOTTERY_ADDRESS);

  console.log("Token (flap.sh):", token);
  console.log("Keeper:", keeper);
  console.log("合约 BNB 余额:", hre.ethers.formatEther(bnbBalance), "BNB");
  console.log("倒计时结束:", new Date(Number(countdown) * 1000).toLocaleString());
  console.log("");
  console.log("✅ 配置完成！");
  console.log("");
  console.log("⚠️  重要：确保 flap.sh 代币的 taxSplitter 地址是:");
  console.log("   ", LOTTERY_ADDRESS);
  console.log("   否则 BNB 税收不会发到这个合约！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("配置失败:", error);
    process.exit(1);
  });
