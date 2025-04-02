const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CBDCToken", function () {
  let RwandanFrancCoin;
  let rwfc;
  let owner;
  let centralBank;
  let user1;
  let user2;

  const initialSupply = ethers.utils.parseEther("1000000"); // 1 million tokens

  beforeEach(async function () {
    [owner, centralBank, user1, user2] = await ethers.getSigners();

    // Deploy RWFC token
    RwandanFrancCoin = await ethers.getContractFactory("RwandanFrancCoin");
    rwfc = await RwandanFrancCoin.deploy(centralBank.address);
    await rwfc.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await rwfc.name()).to.equal("Rwandan Franc Coin");
      expect(await rwfc.symbol()).to.equal("RWFC");
    });

    it("Should set the correct central bank", async function () {
      expect(await rwfc.centralBank()).to.equal(centralBank.address);
    });

    it("Should grant roles to central bank", async function () {
      const ADMIN_ROLE = await rwfc.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await rwfc.MINTER_ROLE();
      const BURNER_ROLE = await rwfc.BURNER_ROLE();
      const PAUSER_ROLE = await rwfc.PAUSER_ROLE();

      expect(await rwfc.hasRole(ADMIN_ROLE, centralBank.address)).to.equal(
        true,
      );
      expect(await rwfc.hasRole(MINTER_ROLE, centralBank.address)).to.equal(
        true,
      );
      expect(await rwfc.hasRole(BURNER_ROLE, centralBank.address)).to.equal(
        true,
      );
      expect(await rwfc.hasRole(PAUSER_ROLE, centralBank.address)).to.equal(
        true,
      );
    });

    it("Should start with zero supply", async function () {
      expect(await rwfc.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow central bank to mint tokens", async function () {
      await rwfc.connect(centralBank).mint(user1.address, initialSupply);

      expect(await rwfc.balanceOf(user1.address)).to.equal(initialSupply);
      expect(await rwfc.totalSupply()).to.equal(initialSupply);
    });

    it("Should emit Minted event on mint", async function () {
      await expect(rwfc.connect(centralBank).mint(user1.address, initialSupply))
        .to.emit(rwfc, "Minted")
        .withArgs(user1.address, initialSupply);
    });

    it("Should revert when non-minter tries to mint", async function () {
      await expect(rwfc.connect(user1).mint(user2.address, initialSupply)).to.be
        .reverted;
    });

    it("Should not allow minting when paused", async function () {
      // Pause the contract
      await rwfc.connect(centralBank).pause();

      // Try to mint
      await expect(
        rwfc.connect(centralBank).mint(user1.address, initialSupply),
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint tokens for testing
      await rwfc.connect(centralBank).mint(user1.address, initialSupply);
    });

    it("Should allow central bank to burn tokens", async function () {
      const burnAmount = ethers.utils.parseEther("10000");

      await rwfc.connect(centralBank).burnFrom(user1.address, burnAmount);

      expect(await rwfc.balanceOf(user1.address)).to.equal(
        initialSupply.sub(burnAmount),
      );
      expect(await rwfc.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    });

    it("Should emit Burned event on burn", async function () {
      const burnAmount = ethers.utils.parseEther("10000");

      await expect(
        rwfc.connect(centralBank).burnFrom(user1.address, burnAmount),
      )
        .to.emit(rwfc, "Burned")
        .withArgs(user1.address, burnAmount);
    });

    it("Should revert when non-burner tries to burn", async function () {
      const burnAmount = ethers.utils.parseEther("10000");

      await expect(rwfc.connect(user2).burnFrom(user1.address, burnAmount)).to
        .be.reverted;
    });

    it("Should allow token holders to burn their own tokens", async function () {
      const burnAmount = ethers.utils.parseEther("5000");

      await rwfc.connect(user1).burn(burnAmount);

      expect(await rwfc.balanceOf(user1.address)).to.equal(
        initialSupply.sub(burnAmount),
      );
      expect(await rwfc.totalSupply()).to.equal(initialSupply.sub(burnAmount));
    });

    it("Should not allow burning when paused", async function () {
      // Pause the contract
      await rwfc.connect(centralBank).pause();

      // Try to burn
      const burnAmount = ethers.utils.parseEther("10000");
      await expect(
        rwfc.connect(centralBank).burnFrom(user1.address, burnAmount),
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      // Mint tokens for testing
      await rwfc.connect(centralBank).mint(user1.address, initialSupply);
    });

    it("Should allow transfers between accounts", async function () {
      const transferAmount = ethers.utils.parseEther("50000");

      await rwfc.connect(user1).transfer(user2.address, transferAmount);

      expect(await rwfc.balanceOf(user1.address)).to.equal(
        initialSupply.sub(transferAmount),
      );
      expect(await rwfc.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("Should not allow transfers when paused", async function () {
      // Pause the contract
      await rwfc.connect(centralBank).pause();

      // Try to transfer
      const transferAmount = ethers.utils.parseEther("50000");
      await expect(
        rwfc.connect(user1).transfer(user2.address, transferAmount),
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow transferFrom with approval", async function () {
      const approveAmount = ethers.utils.parseEther("10000");

      // Approve user2 to spend tokens
      await rwfc.connect(user1).approve(user2.address, approveAmount);

      // User2 transfers tokens from user1 to themselves
      await rwfc
        .connect(user2)
        .transferFrom(user1.address, user2.address, approveAmount);

      expect(await rwfc.balanceOf(user1.address)).to.equal(
        initialSupply.sub(approveAmount),
      );
      expect(await rwfc.balanceOf(user2.address)).to.equal(approveAmount);
    });

    it("Should not allow transferFrom without approval", async function () {
      const transferAmount = ethers.utils.parseEther("5000");

      // User2 tries to transfer tokens from user1 without approval
      await expect(
        rwfc
          .connect(user2)
          .transferFrom(user1.address, user2.address, transferAmount),
      ).to.be.reverted;
    });

    it("Should not allow transferFrom when paused", async function () {
      const approveAmount = ethers.utils.parseEther("10000");

      // Approve user2 to spend tokens
      await rwfc.connect(user1).approve(user2.address, approveAmount);

      // Pause the contract
      await rwfc.connect(centralBank).pause();

      // Try transferFrom
      await expect(
        rwfc
          .connect(user2)
          .transferFrom(user1.address, user2.address, approveAmount),
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("Pausing", function () {
    it("Should allow pauser to pause and unpause", async function () {
      // Initial state is unpaused
      expect(await rwfc.paused()).to.equal(false);

      // Pause
      await rwfc.connect(centralBank).pause();
      expect(await rwfc.paused()).to.equal(true);

      // Unpause
      await rwfc.connect(centralBank).unpause();
      expect(await rwfc.paused()).to.equal(false);
    });

    it("Should revert when non-pauser tries to pause", async function () {
      await expect(rwfc.connect(user1).pause()).to.be.reverted;
    });

    it("Should revert when non-pauser tries to unpause", async function () {
      // Pause first
      await rwfc.connect(centralBank).pause();

      // Try to unpause
      await expect(rwfc.connect(user1).unpause()).to.be.reverted;
    });
  });

  describe("Role management", function () {
    it("Should allow admin to grant roles", async function () {
      const MINTER_ROLE = await rwfc.MINTER_ROLE();

      // Grant minter role to user1
      await rwfc.connect(centralBank).grantRole(MINTER_ROLE, user1.address);

      // Verify role was granted
      expect(await rwfc.hasRole(MINTER_ROLE, user1.address)).to.equal(true);

      // Test minting with new role
      await rwfc.connect(user1).mint(user2.address, 1000);
      expect(await rwfc.balanceOf(user2.address)).to.equal(1000);
    });

    it("Should allow admin to revoke roles", async function () {
      const MINTER_ROLE = await rwfc.MINTER_ROLE();

      // Grant minter role to user1
      await rwfc.connect(centralBank).grantRole(MINTER_ROLE, user1.address);
      expect(await rwfc.hasRole(MINTER_ROLE, user1.address)).to.equal(true);

      // Revoke minter role from user1
      await rwfc.connect(centralBank).revokeRole(MINTER_ROLE, user1.address);
      expect(await rwfc.hasRole(MINTER_ROLE, user1.address)).to.equal(false);

      // Test minting fails after role revoked
      await expect(rwfc.connect(user1).mint(user2.address, 1000)).to.be
        .reverted;
    });

    it("Should revert when non-admin tries to grant roles", async function () {
      const MINTER_ROLE = await rwfc.MINTER_ROLE();

      await expect(rwfc.connect(user1).grantRole(MINTER_ROLE, user2.address)).to
        .be.reverted;
    });
  });
});
