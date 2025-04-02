const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-Border Settlement Integration Tests", function () {
  let rwfcToken;
  let ekesToken;
  let rateProvider;
  let settlement;
  let rwandaCentralBank;
  let kenyaCentralBank;
  let rwandaUser1;
  let rwandaUser2;
  let kenyaUser1;
  let kenyaUser2;

  // Test constants
  const initialExchangeRate = 9450000; // 1 RWF = 0.0945 KES (8 decimal places)
  const updatedExchangeRate = 9700000; // 1 RWF = 0.097 KES
  const initialFeePercentage = 25; // 0.25%
  const updatedFeePercentage = 50; // 0.5%

  const rwfcAmount = ethers.utils.parseEther("1000"); // 1000 RWFC
  const kesAmount = ethers.utils.parseEther("10000"); // 10000 KES

  // Shared state between tests
  let expectedKes1;
  let expectedKes2;
  let expectedRwfc1;
  let expectedRwfc2;
  let fee1;
  let fee2;
  let expectedRwandaUser1Balance;
  let expectedRwandaUser2Balance;
  let expectedKenyaUser1Balance;
  let expectedKenyaUser2Balance;

  before(async function () {
    [
      owner,
      rwandaCentralBank,
      kenyaCentralBank,
      rwandaUser1,
      rwandaUser2,
      kenyaUser1,
      kenyaUser2,
    ] = await ethers.getSigners();

    // Deploy all contracts
    const RwandanFrancCoin = await ethers.getContractFactory(
      "RwandanFrancCoin",
    );
    rwfcToken = await RwandanFrancCoin.deploy(rwandaCentralBank.address);
    await rwfcToken.deployed();

    const ElectronicKenyanShilling = await ethers.getContractFactory(
      "ElectronicKenyanShilling",
    );
    ekesToken = await ElectronicKenyanShilling.deploy(kenyaCentralBank.address);
    await ekesToken.deployed();

    const FixedExchangeRateProvider = await ethers.getContractFactory(
      "FixedExchangeRateProvider",
    );
    rateProvider = await FixedExchangeRateProvider.deploy(initialExchangeRate);
    await rateProvider.deployed();

    const CrossBorderSettlement = await ethers.getContractFactory(
      "CrossBorderSettlement",
    );
    settlement = await CrossBorderSettlement.deploy(
      rwfcToken.address,
      ekesToken.address,
      rateProvider.address,
      initialFeePercentage,
      rwandaCentralBank.address,
      kenyaCentralBank.address,
    );
    await settlement.deployed();

    // Grant roles to settlement contract
    const MINTER_ROLE = await rwfcToken.MINTER_ROLE();
    const BURNER_ROLE = await rwfcToken.BURNER_ROLE();
    const RATE_UPDATER_ROLE = await rateProvider.RATE_UPDATER_ROLE();

    await rwfcToken
      .connect(rwandaCentralBank)
      .grantRole(MINTER_ROLE, settlement.address);
    await rwfcToken
      .connect(rwandaCentralBank)
      .grantRole(BURNER_ROLE, settlement.address);
    await ekesToken
      .connect(kenyaCentralBank)
      .grantRole(MINTER_ROLE, settlement.address);
    await ekesToken
      .connect(kenyaCentralBank)
      .grantRole(BURNER_ROLE, settlement.address);
    await rateProvider.grantRole(RATE_UPDATER_ROLE, owner.address);

    // Mint initial tokens for testing
    await rwfcToken
      .connect(rwandaCentralBank)
      .mint(rwandaUser1.address, rwfcAmount.mul(5));
    await rwfcToken
      .connect(rwandaCentralBank)
      .mint(rwandaUser2.address, rwfcAmount.mul(5));
    await ekesToken
      .connect(kenyaCentralBank)
      .mint(kenyaUser1.address, kesAmount.mul(5));
    await ekesToken
      .connect(kenyaCentralBank)
      .mint(kenyaUser2.address, kesAmount.mul(5));
  });

  describe("System Setup", function () {
    it("Should have all contracts properly configured", async function () {
      expect(await settlement.rwfcToken()).to.equal(rwfcToken.address);
      expect(await settlement.ekesToken()).to.equal(ekesToken.address);
      expect(await settlement.exchangeRateProvider()).to.equal(
        rateProvider.address,
      );
      expect(await settlement.feePercentage()).to.equal(initialFeePercentage);
      expect(await settlement.rwandaCentralBank()).to.equal(
        rwandaCentralBank.address,
      );
      expect(await settlement.kenyaCentralBank()).to.equal(
        kenyaCentralBank.address,
      );

      expect(await rwfcToken.centralBank()).to.equal(rwandaCentralBank.address);
      expect(await ekesToken.centralBank()).to.equal(kenyaCentralBank.address);
      expect(await rateProvider.getExchangeRate()).to.equal(
        initialExchangeRate,
      );
    });

    it("Should have correct initial balances", async function () {
      expect(await rwfcToken.balanceOf(rwandaUser1.address)).to.equal(
        rwfcAmount.mul(5),
      );
      expect(await rwfcToken.balanceOf(rwandaUser2.address)).to.equal(
        rwfcAmount.mul(5),
      );
      expect(await ekesToken.balanceOf(kenyaUser1.address)).to.equal(
        kesAmount.mul(5),
      );
      expect(await ekesToken.balanceOf(kenyaUser2.address)).to.equal(
        kesAmount.mul(5),
      );
    });
  });

  describe("Multiple Transfers", function () {
    it("Should handle multiple Rwanda to Kenya transfers", async function () {
      // First transfer from Rwanda to Kenya
      await rwfcToken
        .connect(rwandaUser1)
        .approve(settlement.address, rwfcAmount);
      await settlement
        .connect(rwandaUser1)
        .transferRwandaToKenya(kenyaUser1.address, rwfcAmount);

      // Second transfer from Rwanda to Kenya
      await rwfcToken
        .connect(rwandaUser2)
        .approve(settlement.address, rwfcAmount.div(2));
      await settlement
        .connect(rwandaUser2)
        .transferRwandaToKenya(kenyaUser2.address, rwfcAmount.div(2));

      // Calculate expected values
      const rwandaToKenyaFee1 = rwfcAmount.mul(initialFeePercentage).div(10000);
      const rwfcAfterFee1 = rwfcAmount.sub(rwandaToKenyaFee1);
      expectedKes1 = rwfcAfterFee1
        .mul(initialExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      const rwandaToKenyaFee2 = rwfcAmount
        .div(2)
        .mul(initialFeePercentage)
        .div(10000);
      const rwfcAfterFee2 = rwfcAmount.div(2).sub(rwandaToKenyaFee2);
      expectedKes2 = rwfcAfterFee2
        .mul(initialExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Check balances
      expect(await rwfcToken.balanceOf(rwandaUser1.address)).to.equal(
        rwfcAmount.mul(4),
      );
      expect(await rwfcToken.balanceOf(rwandaUser2.address)).to.equal(
        rwfcAmount.mul(5).sub(rwfcAmount.div(2)),
      );
      expect(await rwfcToken.balanceOf(rwandaCentralBank.address)).to.equal(
        rwandaToKenyaFee1.add(rwandaToKenyaFee2),
      );

      const kenyaUser1Balance = await ekesToken.balanceOf(kenyaUser1.address);
      const kenyaUser2Balance = await ekesToken.balanceOf(kenyaUser2.address);

      expect(kenyaUser1Balance).to.equal(kesAmount.mul(5).add(expectedKes1));
      expect(kenyaUser2Balance).to.equal(kesAmount.mul(5).add(expectedKes2));
    });

    it("Should handle multiple Kenya to Rwanda transfers", async function () {
      // First transfer from Kenya to Rwanda
      await ekesToken
        .connect(kenyaUser1)
        .approve(settlement.address, kesAmount);
      await settlement
        .connect(kenyaUser1)
        .transferKenyaToRwanda(rwandaUser1.address, kesAmount);

      // Second transfer from Kenya to Rwanda
      await ekesToken
        .connect(kenyaUser2)
        .approve(settlement.address, kesAmount.div(2));
      await settlement
        .connect(kenyaUser2)
        .transferKenyaToRwanda(rwandaUser2.address, kesAmount.div(2));

      // Calculate expected values for first transfer
      fee1 = kesAmount.mul(initialFeePercentage).div(10000);
      const kesAfterFee1 = kesAmount.sub(fee1);
      expectedRwfc1 = kesAfterFee1
        .mul(ethers.BigNumber.from(10).pow(8))
        .div(initialExchangeRate);

      // Calculate expected values for second transfer
      fee2 = kesAmount.div(2).mul(initialFeePercentage).div(10000);
      const kesAfterFee2 = kesAmount.div(2).sub(fee2);
      expectedRwfc2 = kesAfterFee2
        .mul(ethers.BigNumber.from(10).pow(8))
        .div(initialExchangeRate);

      // Calculate user balances
      expectedRwandaUser1Balance = rwfcAmount.mul(4).add(expectedRwfc1);
      expectedRwandaUser2Balance = rwfcAmount
        .mul(5)
        .sub(rwfcAmount.div(2))
        .add(expectedRwfc2);

      // Check balances
      expect(await rwfcToken.balanceOf(rwandaUser1.address)).to.equal(
        expectedRwandaUser1Balance,
      );
      expect(await rwfcToken.balanceOf(rwandaUser2.address)).to.equal(
        expectedRwandaUser2Balance,
      );

      // Calculate Kenya balances accounting for previous transfers
      expectedKenyaUser1Balance = kesAmount
        .mul(5)
        .add(expectedKes1)
        .sub(kesAmount);
      expectedKenyaUser2Balance = kesAmount
        .mul(5)
        .add(expectedKes2)
        .sub(kesAmount.div(2));

      const kenyaUser1Balance = await ekesToken.balanceOf(kenyaUser1.address);
      const kenyaUser2Balance = await ekesToken.balanceOf(kenyaUser2.address);

      expect(kenyaUser1Balance).to.equal(expectedKenyaUser1Balance);
      expect(kenyaUser2Balance).to.equal(expectedKenyaUser2Balance);

      // Check central bank fees
      expect(await ekesToken.balanceOf(kenyaCentralBank.address)).to.equal(
        fee1.add(fee2),
      );
    });
  });

  describe("System Changes", function () {
    it("Should handle exchange rate updates correctly", async function () {
      // Update exchange rate
      await rateProvider.updateRate(updatedExchangeRate);
      expect(await rateProvider.getExchangeRate()).to.equal(
        updatedExchangeRate,
      );

      // Transfer from Rwanda to Kenya with new rate
      await rwfcToken
        .connect(rwandaUser1)
        .approve(settlement.address, rwfcAmount);
      await settlement
        .connect(rwandaUser1)
        .transferRwandaToKenya(kenyaUser1.address, rwfcAmount);

      // Calculate expected values with new rate
      const fee = rwfcAmount.mul(initialFeePercentage).div(10000);
      const rwfcAfterFee = rwfcAmount.sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(updatedExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Check recipient received correct amount based on new rate
      const kenyaUser1Balance = await ekesToken.balanceOf(kenyaUser1.address);

      // Expected balance is previous balance + new transfer
      const expectedBalance = expectedKenyaUser1Balance.add(expectedKesAmount);
      expect(kenyaUser1Balance).to.equal(expectedBalance);

      // Update for next test
      expectedKenyaUser1Balance = expectedBalance;
    });

    it("Should handle fee percentage updates correctly", async function () {
      // Update fee percentage
      await settlement.updateFee(updatedFeePercentage);
      expect(await settlement.feePercentage()).to.equal(updatedFeePercentage);

      // Transfer from Kenya to Rwanda with new fee
      await ekesToken
        .connect(kenyaUser1)
        .approve(settlement.address, kesAmount);
      await settlement
        .connect(kenyaUser1)
        .transferKenyaToRwanda(rwandaUser1.address, kesAmount);

      // Calculate expected values with new fee
      const fee = kesAmount.mul(updatedFeePercentage).div(10000);
      const kesAfterFee = kesAmount.sub(fee);
      const expectedRwfcAmount = kesAfterFee
        .mul(ethers.BigNumber.from(10).pow(8))
        .div(updatedExchangeRate);

      // Check recipient received correct amount based on new fee
      const rwandaUser1Balance = await rwfcToken.balanceOf(rwandaUser1.address);

      // Expected balance is previous balance (from first Kenya-to-Rwanda transfer) + new transfer
      // Need to account for the RWFC spent in the exchange rate update test
      const previousBalance = expectedRwandaUser1Balance.sub(rwfcAmount);
      const expectedRwandaUser1BalanceWithNewFee =
        previousBalance.add(expectedRwfcAmount);
      expect(rwandaUser1Balance).to.equal(expectedRwandaUser1BalanceWithNewFee);

      // Check central bank received correct fee
      const kenyaBankBalance = await ekesToken.balanceOf(
        kenyaCentralBank.address,
      );
      const previousFees = fee1.add(fee2);
      expect(kenyaBankBalance).to.equal(previousFees.add(fee));
    });
  });

  describe("Bidirectional Flow", function () {
    it("Should allow full round-trip transfer", async function () {
      // Transfer from Rwanda to Kenya
      const rwfcTransferAmount = ethers.utils.parseEther("100");
      await rwfcToken
        .connect(rwandaUser2)
        .approve(settlement.address, rwfcTransferAmount);

      const rwandaUser2BalanceBefore = await rwfcToken.balanceOf(
        rwandaUser2.address,
      );
      const kenyaUser2BalanceBefore = await ekesToken.balanceOf(
        kenyaUser2.address,
      );

      // Execute Rwanda to Kenya transfer
      await settlement
        .connect(rwandaUser2)
        .transferRwandaToKenya(kenyaUser2.address, rwfcTransferAmount);

      // Calculate expected KES amount
      const rwfcFee = rwfcTransferAmount.mul(updatedFeePercentage).div(10000);
      const rwfcAfterFee = rwfcTransferAmount.sub(rwfcFee);
      const expectedKesAmount = rwfcAfterFee
        .mul(updatedExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Verify balances after first transfer
      expect(await rwfcToken.balanceOf(rwandaUser2.address)).to.equal(
        rwandaUser2BalanceBefore.sub(rwfcTransferAmount),
      );
      expect(await ekesToken.balanceOf(kenyaUser2.address)).to.equal(
        kenyaUser2BalanceBefore.add(expectedKesAmount),
      );

      // Now transfer back exactly the received amount
      await ekesToken
        .connect(kenyaUser2)
        .approve(settlement.address, expectedKesAmount);

      // Execute Kenya to Rwanda transfer
      await settlement
        .connect(kenyaUser2)
        .transferKenyaToRwanda(rwandaUser2.address, expectedKesAmount);

      // Calculate expected RWFC amount
      const kesFee = expectedKesAmount.mul(updatedFeePercentage).div(10000);
      const kesAfterFee = expectedKesAmount.sub(kesFee);
      const expectedRwfcAmount = kesAfterFee
        .mul(ethers.BigNumber.from(10).pow(8))
        .div(updatedExchangeRate);

      // Verify balances after round trip
      expect(await ekesToken.balanceOf(kenyaUser2.address)).to.equal(
        kenyaUser2BalanceBefore,
      );

      // Due to fee and rounding, the returned amount will be less than the original
      const rwandaUser2BalanceAfter = await rwfcToken.balanceOf(
        rwandaUser2.address,
      );
      expect(rwandaUser2BalanceAfter).to.be.lt(rwandaUser2BalanceBefore);
      expect(rwandaUser2BalanceAfter).to.equal(
        rwandaUser2BalanceBefore
          .sub(rwfcTransferAmount)
          .add(expectedRwfcAmount),
      );

      // Calculate round-trip cost (original amount - returned amount)
      const roundTripCost = rwfcTransferAmount.sub(expectedRwfcAmount);

      // Verify round trip cost is less than 1% of the original amount (considering double fees)
      expect(roundTripCost).to.be.lt(rwfcTransferAmount.div(100));

      console.log(
        "Round-trip cost (RWFC): ",
        ethers.utils.formatEther(roundTripCost),
      );
      console.log(
        "Round-trip cost percentage: ",
        roundTripCost.mul(100).div(rwfcTransferAmount).toString(),
        "%",
      );
    });
  });

  describe("Emergency Procedures", function () {
    it("Should pause and unpause system correctly", async function () {
      // Pause the system
      await settlement.pause();
      expect(await settlement.paused()).to.equal(true);

      // Attempt transfer while paused should fail
      const transferAmount = ethers.utils.parseEther("10");
      await rwfcToken
        .connect(rwandaUser1)
        .approve(settlement.address, transferAmount);

      await expect(
        settlement
          .connect(rwandaUser1)
          .transferRwandaToKenya(kenyaUser1.address, transferAmount),
      ).to.be.revertedWith("Pausable: paused");

      // Unpause the system
      await settlement.unpause();
      expect(await settlement.paused()).to.equal(false);

      // Transfer should now succeed
      await settlement
        .connect(rwandaUser1)
        .transferRwandaToKenya(kenyaUser1.address, transferAmount);
    });
  });
});
