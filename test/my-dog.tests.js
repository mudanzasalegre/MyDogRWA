const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyFirstDog System", function () {
  let owner, user1, user2, treasuryManager, signers, requiredSigners;
  let MyFirstDog, Allowlist, Custodian, Treasury;
  let myFirstDog, allowlist, custodian, treasury;

  const MAX_SUPPLY = 1000;
  const PRICE = ethers.parseEther("0.1");
  const ALLOW_PRICE = ethers.parseEther("0.01");

  beforeEach(async function () {
    // Asegúrate de que haya suficientes signers para cubrir el suministro
    signers = await ethers.getSigners();

    if (!signers || signers.length < requiredSigners) {
      throw new Error(
        `Not enough signers available: ${signers?.length || 0} provided, ${requiredSigners} required`
      );
    }

    [owner, user1, user2, treasuryManager] = signers;

    // Deploy Treasury
    Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy();
    await treasury.waitForDeployment();

    // Deploy Allowlist
    Allowlist = await ethers.getContractFactory("Allowlist");
    allowlist = await Allowlist.deploy(treasury.target);
    await allowlist.waitForDeployment();

    // Deploy Custodian
    Custodian = await ethers.getContractFactory("Custodian");
    custodian = await Custodian.deploy();
    await custodian.waitForDeployment();

    // Deploy MyFirstDog
    MyFirstDog = await ethers.getContractFactory("MyFirstDog");
    myFirstDog = await MyFirstDog.deploy(allowlist.target, treasury.target);
    await myFirstDog.waitForDeployment();

    // Initialize Custodian with MyFirstDog contract
    await custodian.setTokenContract(myFirstDog.target);

    // Inicializar Custodian en MyFirstDog
    await myFirstDog.initializeCustodian(custodian.target);
  });

  describe("Treasury", function () {
    describe("Fund Reception", function () {
      it("should allow receiving ETH and emit FundsReceived event", async function () {
        const tx = await owner.sendTransaction({
          to: treasury.target,
          value: PRICE,
        });
  
        // Verificar que el evento FundsReceived se emitió
        await expect(tx)
          .to.emit(treasury, "FundsReceived")
          .withArgs(owner.address, PRICE);
  
        // Verificar que el balance del contrato aumentó correctamente
        expect(await treasury.getBalance()).to.equal(PRICE);
      });
    });
  
    describe("Fund Withdrawals", function () {
      beforeEach(async function () {
        // Asignar el rol de TREASURY_MANAGER_ROLE al treasuryManager
        await treasury
          .connect(owner)
          .grantRole(
            await treasury.TREASURY_MANAGER_ROLE(),
            treasuryManager.address
          );
  
        // Enviar fondos al contrato
        await owner.sendTransaction({ to: treasury.target, value: PRICE });
      });
  
      it("should allow withdrawals by TREASURY_MANAGER_ROLE", async function () {
        const initialBalance = await ethers.provider.getBalance(
          treasuryManager.address
        );
  
        // Realizar el retiro
        await treasury
          .connect(treasuryManager)
          .withdraw(treasuryManager.address, PRICE);
  
        const finalBalance = await ethers.provider.getBalance(
          treasuryManager.address
        );
        expect(finalBalance).to.be.gt(initialBalance);
      });
  
      it("should revert if non-TREASURY_MANAGER_ROLE tries to withdraw", async function () {
        const requiredRole = await treasury.TREASURY_MANAGER_ROLE();
      
        await expect(
          treasury.connect(user1).withdraw(user1.address, PRICE)
        ).to.be.revertedWith(
          `AccessControl: account ${user1.address.toLowerCase()} is missing role ${requiredRole.toLowerCase()}`
        );
      });
  
      it("should revert if withdrawal amount exceeds available balance", async function () {
        const excessiveAmount = ethers.parseEther("1");
  
        // Intentar un retiro que exceda el balance
        await expect(
          treasury
            .connect(treasuryManager)
            .withdraw(treasuryManager.address, excessiveAmount)
        ).to.be.revertedWith("Treasury: Insufficient balance");
      });
    });
  
    describe("Balance Queries", function () {
      it("should return the correct balance of the contract", async function () {
        // Enviar ETH al contrato
        await owner.sendTransaction({ to: treasury.target, value: PRICE });
  
        // Verificar que el balance reportado por getBalance es correcto
        expect(await treasury.getBalance()).to.equal(PRICE);
      });
  
      it("should return zero balance if no funds have been deposited", async function () {
        // Verificar que el balance sea 0 inicialmente
        expect(await treasury.getBalance()).to.equal(0);
      });
    });
  });

  describe("Full Workflow", function () {
    it("should complete the full lifecycle", async function () {
      await allowlist.allowUser(user1.address);
      await myFirstDog.connect(user1).buy({ value: PRICE });
      await custodian.freeze(user1.address, 1);
      expect(await custodian.frozenBalance(user1.address)).to.equal(1);
    });
  });
});