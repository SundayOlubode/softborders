// scripts/deploy-direct.js
// This script deploys all contracts directly without using a factory
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Simulated central bank addresses - replace with actual addresses in production
  const rwandaCentralBank = process.env.RWANDA_CENTRAL_BANK || deployer.address;
  const kenyaCentralBank = process.env.KENYA_CENTRAL_BANK || deployer.address;
  console.log("Rwanda Central Bank address:", rwandaCentralBank);
  console.log("Kenya Central Bank address:", kenyaCentralBank);

  // Current exchange rate: 1 RWF = 0.0945 KES (as of April 2025)
  // Represented with 8 decimal places: 9450000
  const initialExchangeRate = 9450000;
  const feePercentage = 25; // 0.25%

  // Deploy tokens directly (no factory)
  console.log("Deploying RwandanFrancCoin...");
  const RwandanFrancCoin = await ethers.getContractFactory("RwandanFrancCoin");
  const rwfc = await RwandanFrancCoin.deploy(rwandaCentralBank);
  await rwfc.deployed();
  const rwfcAddress = rwfc.address;
  console.log("RWFC Token deployed to:", rwfcAddress);

  console.log("Deploying ElectronicKenyanShilling...");
  const ElectronicKenyanShilling = await ethers.getContractFactory(
    "ElectronicKenyanShilling",
  );
  const ekes = await ElectronicKenyanShilling.deploy(kenyaCentralBank);
  await ekes.deployed();
  const ekesAddress = ekes.address;
  console.log("eKES Token deployed to:", ekesAddress);

  console.log("Deploying FixedExchangeRateProvider...");
  const FixedExchangeRateProvider = await ethers.getContractFactory(
    "FixedExchangeRateProvider",
  );
  const rateProvider = await FixedExchangeRateProvider.deploy(
    initialExchangeRate,
  );
  await rateProvider.deployed();
  const rateProviderAddress = rateProvider.address;
  console.log("Rate Provider deployed to:", rateProviderAddress);

  console.log("Deploying CrossBorderSettlement...");
  const CrossBorderSettlement = await ethers.getContractFactory(
    "CrossBorderSettlement",
  );
  const settlement = await CrossBorderSettlement.deploy(
    rwfcAddress,
    ekesAddress,
    rateProviderAddress,
    feePercentage,
    rwandaCentralBank,
    kenyaCentralBank,
  );
  await settlement.deployed();
  const settlementAddress = settlement.address;
  console.log("Settlement Contract deployed to:", settlementAddress);

  // Grant roles to settlement contract
  console.log("Granting roles to settlement contract...");
  const minterRole = await rwfc.MINTER_ROLE();
  const burnerRole = await rwfc.BURNER_ROLE();

  await rwfc.grantRole(minterRole, settlementAddress);
  await rwfc.grantRole(burnerRole, settlementAddress);
  await ekes.grantRole(minterRole, settlementAddress);
  await ekes.grantRole(burnerRole, settlementAddress);

  console.log("Roles granted successfully");

  // Log deployment for verification purposes
  console.log("\nDeployment Summary:");
  console.log("====================");
  console.log("RWFC Token:", rwfcAddress);
  console.log("eKES Token:", ekesAddress);
  console.log("Rate Provider:", rateProviderAddress);
  console.log("Settlement Contract:", settlementAddress);
  console.log("\nVerification:");
  console.log("To verify contracts on Etherscan, run:");
  console.log(
    `npx hardhat verify --network sepolia ${rwfcAddress} ${rwandaCentralBank}`,
  );
  console.log(
    `npx hardhat verify --network sepolia ${ekesAddress} ${kenyaCentralBank}`,
  );
  console.log(
    `npx hardhat verify --network sepolia ${rateProviderAddress} ${initialExchangeRate}`,
  );
  console.log(
    `npx hardhat verify --network sepolia ${settlementAddress} ${rwfcAddress} ${ekesAddress} ${rateProviderAddress} ${feePercentage} ${rwandaCentralBank} ${kenyaCentralBank}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
