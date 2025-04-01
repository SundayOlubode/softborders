// scripts/test-transfer.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Connect to deployed contracts
  const rwfc = await ethers.getContractAt(
    "RwandanFrancCoin",
    "0x5eB2E66488EF6CD286F0a738476Ed4538A4d4ACd",
  );
  const ekes = await ethers.getContractAt(
    "ElectronicKenyanShilling",
    "0xf3aFB8F6D51655d38cB03E5E231048bbE7B3a039",
  );
  const settlement = await ethers.getContractAt(
    "CrossBorderSettlement",
    "0x824CA95AafC222D344B660Aa38d0a2a8D2baDf92",
  );

  // Mint some RWFC tokens (if you have the MINTER_ROLE)
  console.log("Minting 1000 RWFC...");
  const amount = ethers.utils.parseEther("1000");
  await rwfc.mint(deployer.address, amount);

  // Check balance
  const balance = await rwfc.balanceOf(deployer.address);
  console.log("RWFC Balance:", ethers.utils.formatEther(balance));

  // Approve settlement contract
  console.log("Approving settlement contract...");
  const transferAmount = ethers.utils.parseEther("100");
  await rwfc.approve(settlement.address, transferAmount);

  // Transfer to Kenya (use your own recipient address)
  const recipient = "0x8fCA103AF6b79165943c4F9e40B9beFDAc21aA66"; // Replace with actual address
  console.log(`Transferring 100 RWFC to Kenya (${recipient})...`);
  await settlement.transferRwandaToKenya(recipient, transferAmount);

  console.log("Transfer completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
