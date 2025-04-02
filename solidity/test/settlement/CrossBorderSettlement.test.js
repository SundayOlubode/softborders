const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossBorderSettlement", function () {
  let rwfcToken;
  let ekesToken;
  let rateProvider;
  let settlement;
  let owner;
  let rwandaCentralBank;
  let kenyaCentralBank;
  let rwandaUser;
  let kenyaUser;

  // Test constants
  const initialExchangeRate = 9450000; // 1 RWF = 0.0945 KES (8 decimal places)
  const initialFeePercentage = 25; // 0.25%
  const rwfcAmount = ethers.utils.parseEther("1000"); // 1000 RWFC
  const kesAmount = ethers.utils.parseEther("10000"); // 10000 KES

  beforeEach(async function () {
    [owner, rwandaCentralBank, kenyaCentralBank, rwandaUser, kenyaUser] =
      await ethers.getSigners();

    // Deploy tokens
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

    // Deploy fixed exchange rate provider
    const FixedExchangeRateProvider = await ethers.getContractFactory(
      "FixedExchangeRateProvider",
    );
    rateProvider = await FixedExchangeRateProvider.deploy(initialExchangeRate);
    await rateProvider.deployed();

    // Deploy settlement contract
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

    // Mint initial tokens for testing
    await rwfcToken
      .connect(rwandaCentralBank)
      .mint(rwandaUser.address, rwfcAmount.mul(10));
    await ekesToken
      .connect(kenyaCentralBank)
      .mint(kenyaUser.address, kesAmount.mul(10));
  });

  describe("Deployment", function () {
    it("Should set the correct tokens and providers", async function () {
      expect(await settlement.rwfcToken()).to.equal(rwfcToken.address);
      expect(await settlement.ekesToken()).to.equal(ekesToken.address);
      expect(await settlement.exchangeRateProvider()).to.equal(
        rateProvider.address,
      );
    });

    it("Should set the correct fee percentage", async function () {
      expect(await settlement.feePercentage()).to.equal(initialFeePercentage);
    });

    it("Should set the correct central banks", async function () {
      expect(await settlement.rwandaCentralBank()).to.equal(
        rwandaCentralBank.address,
      );
      expect(await settlement.kenyaCentralBank()).to.equal(
        kenyaCentralBank.address,
      );
    });

    it("Should have the correct roles", async function () {
      const ADMIN_ROLE = await settlement.ADMIN_ROLE();
      const FEE_MANAGER_ROLE = await settlement.FEE_MANAGER_ROLE();
      const RATE_PROVIDER_MANAGER_ROLE =
        await settlement.RATE_PROVIDER_MANAGER_ROLE();

      expect(await settlement.hasRole(ADMIN_ROLE, owner.address)).to.equal(
        true,
      );
      expect(
        await settlement.hasRole(FEE_MANAGER_ROLE, owner.address),
      ).to.equal(true);
      expect(
        await settlement.hasRole(RATE_PROVIDER_MANAGER_ROLE, owner.address),
      ).to.equal(true);
    });
  });

  describe("Rwanda to Kenya Transfer", function () {
    beforeEach(async function () {
      // Approve settlement contract to spend RWFC
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, rwfcAmount);
    });

    it("Should transfer RWFC from Rwanda to Kenya and convert to eKES", async function () {
      // Initial balances
      const rwandaUserRwfcBefore = await rwfcToken.balanceOf(
        rwandaUser.address,
      );
      const kenyaUserKesBefore = await ekesToken.balanceOf(kenyaUser.address);
      const rwandaBankRwfcBefore = await rwfcToken.balanceOf(
        rwandaCentralBank.address,
      );

      // Calculate expected values
      const fee = rwfcAmount.mul(initialFeePercentage).div(10000);
      const rwfcAfterFee = rwfcAmount.sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(initialExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Execute transfer
      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, rwfcAmount),
      )
        .to.emit(settlement, "SettlementRwandaToKenya")
        .withArgs(
          rwandaUser.address,
          kenyaUser.address,
          rwfcAmount,
          expectedKesAmount,
          initialExchangeRate,
          fee,
        );

      // Check balances after transfer
      const rwandaUserRwfcAfter = await rwfcToken.balanceOf(rwandaUser.address);
      const kenyaUserKesAfter = await ekesToken.balanceOf(kenyaUser.address);
      const rwandaBankRwfcAfter = await rwfcToken.balanceOf(
        rwandaCentralBank.address,
      );

      // Verify results
      expect(rwandaUserRwfcAfter).to.equal(
        rwandaUserRwfcBefore.sub(rwfcAmount),
      );
      expect(kenyaUserKesAfter).to.equal(
        kenyaUserKesBefore.add(expectedKesAmount),
      );
      expect(rwandaBankRwfcAfter).to.equal(rwandaBankRwfcBefore.add(fee));

      // Verify RWFC was burned (by checking total supply decreased)
      const totalSupplyAfter = await rwfcToken.totalSupply();
      expect(totalSupplyAfter).to.equal(
        rwandaUserRwfcBefore.add(rwandaBankRwfcBefore).sub(rwfcAfterFee),
      );
    });

    it("Should fail if amount is zero", async function () {
      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, 0),
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should fail if not approved", async function () {
      // Reset approval
      await rwfcToken.connect(rwandaUser).approve(settlement.address, 0);

      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, rwfcAmount),
      ).to.be.reverted;
    });

    it("Should fail when paused", async function () {
      // Pause the contract
      await settlement.pause();

      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, rwfcAmount),
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Kenya to Rwanda Transfer", function () {
    beforeEach(async function () {
      // Approve settlement contract to spend eKES
      await ekesToken.connect(kenyaUser).approve(settlement.address, kesAmount);
    });

    it("Should transfer eKES from Kenya to Rwanda and convert to RWFC", async function () {
      // Initial balances
      const kenyaUserKesBefore = await ekesToken.balanceOf(kenyaUser.address);
      const rwandaUserRwfcBefore = await rwfcToken.balanceOf(
        rwandaUser.address,
      );
      const kenyaBankKesBefore = await ekesToken.balanceOf(
        kenyaCentralBank.address,
      );

      // Calculate expected values
      const fee = kesAmount.mul(initialFeePercentage).div(10000);
      const kesAfterFee = kesAmount.sub(fee);
      const expectedRwfcAmount = kesAfterFee
        .mul(ethers.BigNumber.from(10).pow(8))
        .div(initialExchangeRate);

      // Execute transfer
      await expect(
        settlement
          .connect(kenyaUser)
          .transferKenyaToRwanda(rwandaUser.address, kesAmount),
      )
        .to.emit(settlement, "SettlementKenyaToRwanda")
        .withArgs(
          kenyaUser.address,
          rwandaUser.address,
          kesAmount,
          expectedRwfcAmount,
          initialExchangeRate,
          fee,
        );

      // Check balances after transfer
      const kenyaUserKesAfter = await ekesToken.balanceOf(kenyaUser.address);
      const rwandaUserRwfcAfter = await rwfcToken.balanceOf(rwandaUser.address);
      const kenyaBankKesAfter = await ekesToken.balanceOf(
        kenyaCentralBank.address,
      );

      // Verify results
      expect(kenyaUserKesAfter).to.equal(kenyaUserKesBefore.sub(kesAmount));
      expect(rwandaUserRwfcAfter).to.equal(
        rwandaUserRwfcBefore.add(expectedRwfcAmount),
      );
      expect(kenyaBankKesAfter).to.equal(kenyaBankKesBefore.add(fee));

      // Verify eKES was burned (by checking total supply decreased)
      const totalSupplyAfter = await ekesToken.totalSupply();
      expect(totalSupplyAfter).to.equal(
        kenyaUserKesBefore.add(kenyaBankKesBefore).sub(kesAfterFee),
      );
    });

    it("Should fail if amount is zero", async function () {
      await expect(
        settlement
          .connect(kenyaUser)
          .transferKenyaToRwanda(rwandaUser.address, 0),
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should fail if not approved", async function () {
      // Reset approval
      await ekesToken.connect(kenyaUser).approve(settlement.address, 0);

      await expect(
        settlement
          .connect(kenyaUser)
          .transferKenyaToRwanda(rwandaUser.address, kesAmount),
      ).to.be.reverted;
    });

    it("Should fail when paused", async function () {
      // Pause the contract
      await settlement.pause();

      await expect(
        settlement
          .connect(kenyaUser)
          .transferKenyaToRwanda(rwandaUser.address, kesAmount),
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Fee Management", function () {
    it("Should allow fee manager to update fee", async function () {
      const newFee = 50; // 0.5%

      await expect(settlement.updateFee(newFee))
        .to.emit(settlement, "FeeUpdated")
        .withArgs(initialFeePercentage, newFee);

      expect(await settlement.feePercentage()).to.equal(newFee);
    });

    it("Should apply new fee to transfers", async function () {
      // Update fee to 0.5%
      const newFee = 50;
      await settlement.updateFee(newFee);

      // Approve and transfer
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, rwfcAmount);

      // Calculate expected values with new fee
      const fee = rwfcAmount.mul(newFee).div(10000);
      const rwfcAfterFee = rwfcAmount.sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(initialExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Execute transfer
      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, rwfcAmount),
      )
        .to.emit(settlement, "SettlementRwandaToKenya")
        .withArgs(
          rwandaUser.address,
          kenyaUser.address,
          rwfcAmount,
          expectedKesAmount,
          initialExchangeRate,
          fee,
        );
    });

    it("Should revert when non-fee-manager tries to update fee", async function () {
      await expect(settlement.connect(rwandaUser).updateFee(50)).to.be.reverted;
    });

    it("Should revert when fee exceeds 10%", async function () {
      const excessiveFee = 1001; // 10.01%

      await expect(settlement.updateFee(excessiveFee)).to.be.revertedWith(
        "Fee cannot exceed 10%",
      );
    });
  });

  describe("Exchange Rate Provider Management", function () {
    it("Should allow rate provider manager to update provider", async function () {
      // Deploy a new rate provider with different rate
      const newRate = 9600000;
      const newRateProvider = await ethers
        .getContractFactory("FixedExchangeRateProvider")
        .then((factory) => factory.deploy(newRate));
      await newRateProvider.deployed();

      // Update rate provider
      await expect(
        settlement.updateExchangeRateProvider(newRateProvider.address),
      )
        .to.emit(settlement, "ExchangeRateProviderUpdated")
        .withArgs(rateProvider.address, newRateProvider.address);

      expect(await settlement.exchangeRateProvider()).to.equal(
        newRateProvider.address,
      );
    });

    it("Should use new rate provider for transfers", async function () {
      // Deploy new rate provider
      const newRate = 9600000;
      const newRateProvider = await ethers
        .getContractFactory("FixedExchangeRateProvider")
        .then((factory) => factory.deploy(newRate));
      await newRateProvider.deployed();

      // Update rate provider
      await settlement.updateExchangeRateProvider(newRateProvider.address);

      // Approve and transfer
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, rwfcAmount);

      // Calculate expected values with new rate
      const fee = rwfcAmount.mul(initialFeePercentage).div(10000);
      const rwfcAfterFee = rwfcAmount.sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(newRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Execute transfer
      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, rwfcAmount),
      )
        .to.emit(settlement, "SettlementRwandaToKenya")
        .withArgs(
          rwandaUser.address,
          kenyaUser.address,
          rwfcAmount,
          expectedKesAmount,
          newRate,
          fee,
        );
    });

    it("Should revert when non-manager tries to update provider", async function () {
      const newRateProvider = await ethers
        .getContractFactory("FixedExchangeRateProvider")
        .then((factory) => factory.deploy(9600000));
      await newRateProvider.deployed();

      await expect(
        settlement
          .connect(rwandaUser)
          .updateExchangeRateProvider(newRateProvider.address),
      ).to.be.reverted;
    });
  });

  describe("Pausing", function () {
    it("Should allow admin to pause and unpause", async function () {
      // Initial state is unpaused
      expect(await settlement.paused()).to.equal(false);

      // Pause
      await settlement.pause();
      expect(await settlement.paused()).to.equal(true);

      // Unpause
      await settlement.unpause();
      expect(await settlement.paused()).to.equal(false);
    });

    it("Should revert when non-admin tries to pause", async function () {
      await expect(settlement.connect(rwandaUser).pause()).to.be.reverted;
    });

    it("Should revert when non-admin tries to unpause", async function () {
      // Pause first
      await settlement.pause();

      // Try to unpause
      await expect(settlement.connect(rwandaUser).unpause()).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle exchange rate updates between transfers correctly", async function () {
      // First transfer with initial rate
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, rwfcAmount.div(2));
      await settlement
        .connect(rwandaUser)
        .transferRwandaToKenya(kenyaUser.address, rwfcAmount.div(2));

      // Update exchange rate
      const newRate = 9700000; // 1 RWF = 0.097 KES
      const RATE_UPDATER_ROLE = await rateProvider.RATE_UPDATER_ROLE();
      await rateProvider.grantRole(RATE_UPDATER_ROLE, owner.address);
      await rateProvider.updateRate(newRate);

      // Second transfer with new rate
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, rwfcAmount.div(2));

      // Calculate expected values with new rate
      const fee = rwfcAmount.div(2).mul(initialFeePercentage).div(10000);
      const rwfcAfterFee = rwfcAmount.div(2).sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(newRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Execute transfer with new rate
      await expect(
        settlement
          .connect(rwandaUser)
          .transferRwandaToKenya(kenyaUser.address, rwfcAmount.div(2)),
      )
        .to.emit(settlement, "SettlementRwandaToKenya")
        .withArgs(
          rwandaUser.address,
          kenyaUser.address,
          rwfcAmount.div(2),
          expectedKesAmount,
          newRate,
          fee,
        );
    });

    it("Should handle precision issues correctly in conversions", async function () {
      // Use a very small amount to test precision
      const smallAmount = ethers.utils.parseEther("0.0001"); // 0.0001 RWFC

      // Approve and transfer
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, smallAmount);

      // Calculate expected values with precision
      const fee = smallAmount.mul(initialFeePercentage).div(10000);
      const rwfcAfterFee = smallAmount.sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(initialExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Check that even tiny amounts convert correctly
      expect(expectedKesAmount.gt(0)).to.equal(
        true,
        "Expected KES amount should be greater than zero",
      );

      // Execute transfer
      await settlement
        .connect(rwandaUser)
        .transferRwandaToKenya(kenyaUser.address, smallAmount);

      // Verify recipient received the correct amount
      const kenyaUserKesBalance = await ekesToken.balanceOf(kenyaUser.address);
      expect(kenyaUserKesBalance.sub(kesAmount.mul(10))).to.equal(
        expectedKesAmount,
      );
    });

    it("Should handle large transfers correctly", async function () {
      // Use a very large amount
      const largeAmount = ethers.utils.parseEther("1000000"); // 1 million RWFC

      // Mint large amount for testing
      await rwfcToken
        .connect(rwandaCentralBank)
        .mint(rwandaUser.address, largeAmount);

      // Approve and transfer
      await rwfcToken
        .connect(rwandaUser)
        .approve(settlement.address, largeAmount);

      // Calculate expected values
      const fee = largeAmount.mul(initialFeePercentage).div(10000);
      const rwfcAfterFee = largeAmount.sub(fee);
      const expectedKesAmount = rwfcAfterFee
        .mul(initialExchangeRate)
        .div(ethers.BigNumber.from(10).pow(8));

      // Execute transfer
      await settlement
        .connect(rwandaUser)
        .transferRwandaToKenya(kenyaUser.address, largeAmount);

      // Verify recipient received the correct amount
      const kenyaUserKesBalance = await ekesToken.balanceOf(kenyaUser.address);
      expect(kenyaUserKesBalance.sub(kesAmount.mul(10))).to.equal(
        expectedKesAmount,
      );
    });
  });
});
