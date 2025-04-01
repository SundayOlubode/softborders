// scripts/deploy-settlement.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Simulated central bank addresses
  const rwandaCentralBank = "0x..."; // Replace with actual address
  const kenyaCentralBank = "0x..."; // Replace with actual address

  // Deploy the factory contract
  const SettlementFactory = await ethers.getContractFactory(
    "SettlementFactory",
  );
  const factory = await SettlementFactory.deploy();
  await factory.deployed();
  console.log("SettlementFactory deployed to:", factory.address);

  // Option 1: Deploy with fixed exchange rate
  // Current exchange rate: 1 RWF = 0.0945 KES (as of April 2025)
  // Represented with 8 decimal places: 9450000
  const initialExchangeRate = 9450000;
  const feePercentage = 25; // 0.25%

  console.log("Deploying settlement system with fixed exchange rate...");
  const tx1 = await factory.deployWithFixedRate(
    rwandaCentralBank,
    kenyaCentralBank,
    initialExchangeRate,
    feePercentage,
  );

  const receipt1 = await tx1.wait();
  const event1 = receipt1.events.find(
    (e) => e.event === "SettlementSystemDeployed",
  );
  const [rwfcAddress1, ekesAddress1, rateProviderAddress1, settlementAddress1] =
    event1.args;

  console.log("Fixed Rate System Deployed:");
  console.log("RWFC Token:", rwfcAddress1);
  console.log("eKES Token:", ekesAddress1);
  console.log("Fixed Rate Provider:", rateProviderAddress1);
  console.log("Settlement Contract:", settlementAddress1);

  // Option 2: Deploy with oracle-based exchange rate
  // First deploy a mock oracle for testing
  const MockOracle = await ethers.getContractFactory("MockOracle");
  const mockOracle = await MockOracle.deploy(
    initialExchangeRate, // Same initial rate
    8, // 8 decimals
  );
  await mockOracle.deployed();
  console.log("Mock Oracle deployed to:", mockOracle.address);

  console.log("Deploying settlement system with oracle-based exchange rate...");
  const tx2 = await factory.deployWithOracle(
    rwandaCentralBank,
    kenyaCentralBank,
    mockOracle.address,
    feePercentage,
  );

  const receipt2 = await tx2.wait();
  const event2 = receipt2.events.find(
    (e) => e.event === "SettlementSystemDeployed",
  );
  const [rwfcAddress2, ekesAddress2, rateProviderAddress2, settlementAddress2] =
    event2.args;

  console.log("Oracle-Based System Deployed:");
  console.log("RWFC Token:", rwfcAddress2);
  console.log("eKES Token:", ekesAddress2);
  console.log("Oracle Rate Provider:", rateProviderAddress2);
  console.log("Settlement Contract:", settlementAddress2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
