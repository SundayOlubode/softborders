const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExchangeRateProviders", function () {
  let FixedExchangeRateProvider;
  let OracleExchangeRateProvider;
  let MockOracle;
  let fixedRateProvider;
  let oracleRateProvider;
  let mockOracle;
  let owner;
  let rateUpdater;
  let user;

  const initialRate = 9450000; // 1 RWF = 0.0945 KES (8 decimal places)
  const newRate = 9500000; // 1 RWF = 0.095 KES

  beforeEach(async function () {
    [owner, rateUpdater, user] = await ethers.getSigners();

    // Deploy mock oracle first
    MockOracle = await ethers.getContractFactory("MockOracle");
    mockOracle = await MockOracle.deploy(initialRate, 8);
    await mockOracle.deployed();

    // Deploy fixed rate provider
    FixedExchangeRateProvider = await ethers.getContractFactory(
      "FixedExchangeRateProvider",
    );
    fixedRateProvider = await FixedExchangeRateProvider.deploy(initialRate);
    await fixedRateProvider.deployed();

    // Deploy oracle rate provider
    OracleExchangeRateProvider = await ethers.getContractFactory(
      "OracleExchangeRateProvider",
    );
    oracleRateProvider = await OracleExchangeRateProvider.deploy(
      mockOracle.address,
    );
    await oracleRateProvider.deployed();

    // Grant roles
    const RATE_UPDATER_ROLE = await fixedRateProvider.RATE_UPDATER_ROLE();
    await fixedRateProvider.grantRole(RATE_UPDATER_ROLE, rateUpdater.address);

    const ORACLE_UPDATER_ROLE = await oracleRateProvider.ORACLE_UPDATER_ROLE();
    await oracleRateProvider.grantRole(
      ORACLE_UPDATER_ROLE,
      rateUpdater.address,
    );
  });

  describe("FixedExchangeRateProvider", function () {
    it("Should initialize with the correct rate", async function () {
      expect(await fixedRateProvider.getExchangeRate()).to.equal(initialRate);
      expect(await fixedRateProvider.rwfcToKesRate()).to.equal(initialRate);
    });

    it("Should allow rate updater to update the rate", async function () {
      await fixedRateProvider.connect(rateUpdater).updateRate(newRate);

      expect(await fixedRateProvider.getExchangeRate()).to.equal(newRate);
      expect(await fixedRateProvider.rwfcToKesRate()).to.equal(newRate);
    });

    it("Should emit RateUpdated event when rate is updated", async function () {
      await expect(fixedRateProvider.connect(rateUpdater).updateRate(newRate))
        .to.emit(fixedRateProvider, "RateUpdated")
        .withArgs(initialRate, newRate);
    });

    it("Should revert when non-updater tries to update rate", async function () {
      await expect(fixedRateProvider.connect(user).updateRate(newRate)).to.be
        .reverted;
    });

    it("Should revert when updating to a zero rate", async function () {
      await expect(
        fixedRateProvider.connect(rateUpdater).updateRate(0),
      ).to.be.revertedWith("Rate must be positive");
    });
  });

  describe("OracleExchangeRateProvider", function () {
    it("Should get rate from oracle", async function () {
      const rate = await oracleRateProvider.getExchangeRate();
      expect(rate).to.equal(initialRate);
    });

    it("Should use updated oracle rate", async function () {
      // Update oracle rate
      await mockOracle.updatePrice(newRate);

      // Check if provider uses the new rate
      const rate = await oracleRateProvider.getExchangeRate();
      expect(rate).to.equal(newRate);
    });

    it("Should allow oracle updater to update oracle address", async function () {
      // Deploy a new mock oracle with different rate
      const differentRate = 9600000;
      const newMockOracle = await MockOracle.deploy(differentRate, 8);
      await newMockOracle.deployed();

      // Update oracle address
      await expect(
        oracleRateProvider
          .connect(rateUpdater)
          .updateOracle(newMockOracle.address),
      )
        .to.emit(oracleRateProvider, "OracleUpdated")
        .withArgs(mockOracle.address, newMockOracle.address);

      // Check if provider uses the new oracle's rate
      const rate = await oracleRateProvider.getExchangeRate();
      expect(rate).to.equal(differentRate);
    });

    it("Should revert when non-updater tries to update oracle", async function () {
      const newMockOracle = await MockOracle.deploy(newRate, 8);
      await newMockOracle.deployed();

      await expect(
        oracleRateProvider.connect(user).updateOracle(newMockOracle.address),
      ).to.be.reverted;
    });

    it("Should revert when oracle returns negative price", async function () {
      // Update oracle to provide a negative price
      await mockOracle.updatePrice(-100);

      // Attempt to get rate should revert
      await expect(oracleRateProvider.getExchangeRate()).to.be.revertedWith(
        "Invalid oracle price",
      );
    });

    it("Should revert when oracle returns zero price", async function () {
      // Update oracle to provide a zero price
      await mockOracle.updatePrice(0);

      // Attempt to get rate should revert
      await expect(oracleRateProvider.getExchangeRate()).to.be.revertedWith(
        "Invalid oracle price",
      );
    });
  });

  describe("MockOracle", function () {
    it("Should return the correct price data", async function () {
      const roundData = await mockOracle.latestRoundData();
      expect(roundData.answer).to.equal(initialRate);
    });

    it("Should update price correctly", async function () {
      await mockOracle.updatePrice(newRate);

      const roundData = await mockOracle.latestRoundData();
      expect(roundData.answer).to.equal(newRate);
    });

    it("Should return correct decimals", async function () {
      const decimals = await mockOracle.decimals();
      expect(decimals).to.equal(8);
    });

    it("Should return correct description", async function () {
      const description = await mockOracle.description();
      expect(description).to.equal("RWFC / KES");
    });
  });
});
