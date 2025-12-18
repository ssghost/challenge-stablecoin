import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
// 移除不必要的 import，減少依賴
// import { fetchPriceFromUniswap } from "../scripts/fetchPriceFromUniswap";

/**
 * Optimized Deployment Script for 0.05 ETH Budget
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // 1. 省錢優化：直接硬編碼 ETH 價格 (例如 $3000)，省去查詢的麻煩與潛在失敗
  // 3000 * 1e18
  const ethPrice = BigInt("3000000000000000000000");

  const deployerNonce = await hre.ethers.provider.getTransactionCount(deployer);

  console.log(`\n💰 Deploying with account: ${deployer}`);
  console.log(`⛽ Current Nonce: ${deployerNonce}`);
  console.log("----------------------------------------------------");

  // 預計算地址 (這是 Circular Dependency 的關鍵，不能改)
  const futureStakingAddress = hre.ethers.getCreateAddress({
    from: deployer,
    nonce: deployerNonce + 4,
  });
  const futureEngineAddress = hre.ethers.getCreateAddress({
    from: deployer,
    nonce: deployerNonce + 5,
  });

  // -------------------------
  // 開始部署 (按順序，不能亂)
  // -------------------------

  // 1. RateController
  await deploy("RateController", {
    from: deployer,
    args: [futureEngineAddress, futureStakingAddress],
    log: true,
    autoMine: true,
  });
  const rateController = await hre.ethers.getContract<Contract>("RateController", deployer);

  // 2. MyUSD (Stablecoin)
  await deploy("MyUSD", {
    from: deployer,
    args: [futureEngineAddress, futureStakingAddress],
    log: true,
    autoMine: true,
  });
  const stablecoin = await hre.ethers.getContract<Contract>("MyUSD", deployer);

  // 3. DEX
  await deploy("DEX", {
    from: deployer,
    args: [stablecoin.target],
    log: true,
    autoMine: true,
  });
  const DEX = await hre.ethers.getContract<Contract>("DEX", deployer);

  // 4. Oracle
  await deploy("Oracle", {
    from: deployer,
    args: [DEX.target, ethPrice], // 使用硬編碼的價格
    log: true,
    autoMine: true,
  });
  const oracle = await hre.ethers.getContract<Contract>("Oracle", deployer);

  // 5. MyUSDStaking
  await deploy("MyUSDStaking", {
    from: deployer,
    args: [stablecoin.target, futureEngineAddress, rateController.target],
    log: true,
    autoMine: true,
  });
  const staking = await hre.ethers.getContract<Contract>("MyUSDStaking", deployer);

  // 6. MyUSDEngine (核心，最貴)
  await deploy("MyUSDEngine", {
    from: deployer,
    args: [oracle.target, stablecoin.target, staking.target, rateController.target],
    log: true,
    autoMine: true,
  });
  const engine = await hre.ethers.getContract<Contract>("MyUSDEngine", deployer);

  // 檢查地址預測是否準確
  if (engine.target !== futureEngineAddress) {
    throw new Error(
      "❌ Engine address mismatch! Predicted: ${futureEngineAddress}, Got: ${engine.target}. Did a transaction fail?",
    );
  }

  console.log("----------------------------------------------------");
  console.log("✅ All contracts deployed successfully!");
};

export default deployContracts;
deployContracts.tags = ["all"];
