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

  describe("MyFirstDog", function () {
    describe("Initialization", function () {
      it("should initialize with correct roles and token distribution", async function () {
        expect(
          await myFirstDog.hasRole(
            await myFirstDog.DEFAULT_ADMIN_ROLE(),
            owner.address,
          ),
        ).to.be.true;
        expect(
          await myFirstDog.hasRole(
            await myFirstDog.MINTER_ROLE(),
            owner.address,
          ),
        ).to.be.true;
        expect(await myFirstDog.balanceOf(owner.address)).to.equal(1);
      });
    });

    describe("Buying Tokens", function () {
      beforeEach(async function () {
        await allowlist.allowUser(user1.address);
      });

      it("should allow purchase if user is on the Allowlist", async function () {
        await myFirstDog.connect(user1).buy({ value: PRICE });
        expect(await myFirstDog.balanceOf(user1.address)).to.equal(1);
      });

      it("should revert if user is not on the Allowlist", async function () {
        await expect(
          myFirstDog.connect(user2).buy({ value: PRICE }),
        ).to.be.revertedWith("Allowlist: Not allowed");
      });

      it("should revert if user has already purchased", async function () {
        await myFirstDog.connect(user1).buy({ value: PRICE });
        await expect(
          myFirstDog.connect(user1).buy({ value: PRICE }),
        ).to.be.revertedWith("Already purchased");
      });

      it("should revert if maximum supply is reached", async function () {
        const availableSupply = MAX_SUPPLY - 1; // Resta el token inicial del constructor
        const priceBN = ethers.parseEther("0.1");

        // Asegúrate de que haya suficientes signers para cubrir el suministro
        const requiredSigners = availableSupply + 3; // Contempla los iniciales + requeridos

        if (signers.length < requiredSigners) {
          throw new Error(
            `Not enough signers available: ${signers.length} provided, ${requiredSigners} required`,
          );
        }

        for (let i = 0; i < availableSupply; i++) {
          const tempSigner = signers[i + 3]; // Comienza después de los iniciales
          await allowlist.allowUser(tempSigner.address);

          // Financiar al signer temporal con suficiente ETH para cubrir la transacción
          await owner.sendTransaction({
            to: tempSigner.address,
            value: priceBN,
          });

          // Realizar la compra
          await myFirstDog.connect(tempSigner).buy({ value: priceBN });
        }

        // Intentar una compra adicional debería fallar
        await allowlist.allowUser(user1.address);
        await expect(
          myFirstDog.connect(user1).buy({ value: priceBN }),
        ).to.be.revertedWith("Max supply reached");
      });

      it("should revert if incorrect ETH amount is sent", async function () {
        await expect(
          myFirstDog.connect(user1).buy({ value: ethers.parseEther("0.05") }),
        ).to.be.revertedWith("Incorrect payment amount");
      });
    });

    describe("Pausable", function () {
      it("should allow pausing and unpausing by PAUSER_ROLE", async function () {
          await allowlist.allowUser(user1.address); // Asegúrate de que esté en la Allowlist

          // Pausar el contrato
          await myFirstDog.pause();
          expect(await myFirstDog.paused()).to.be.true; // Verifica que el contrato está pausado

          // Intentar comprar mientras está pausado debería fallar con el error personalizado EnforcedPause
          await expect(
              myFirstDog.connect(user1).buy({ value: PRICE })
          ).to.be.revertedWithCustomError(myFirstDog, "EnforcedPause");

          // Despausar el contrato
          await myFirstDog.unpause();
          expect(await myFirstDog.paused()).to.be.false; // Verifica que el contrato no está pausado

          // Ahora debería permitir la compra
          await myFirstDog.connect(user1).buy({ value: PRICE });
          expect(await myFirstDog.balanceOf(user1.address)).to.equal(1);
      });

      it("should revert if non-PAUSER_ROLE tries to pause", async function () {
        await expect(myFirstDog.connect(user1).pause()).to.be.reverted;
      });
    });

    describe("Minting", function () {
      it("should allow minting by MINTER_ROLE", async function () {
        await myFirstDog.mint(user1.address, 10);
        expect(await myFirstDog.balanceOf(user1.address)).to.equal(10);
      });

      it("should revert if minting exceeds MAX_SUPPLY", async function () {
        await expect(
          myFirstDog.mint(user1.address, MAX_SUPPLY + 1),
        ).to.be.revertedWith("Exceeds maximum supply");
      });
    });
  });

  describe("Allowlist", function () {
    describe("User Management", function () {
      it("should allow a user to register on the Allowlist", async function () {
        await allowlist.connect(user1).getAllowed({ value: ALLOW_PRICE });
        expect(await allowlist.isAllowed(user1.address)).to.be.true;
      });

      it("should revert if user is blacklisted", async function () {
        await allowlist.blacklistUser(user1.address);
        await expect(
          allowlist.connect(user1).getAllowed({ value: ALLOW_PRICE }),
        ).to.be.revertedWith("Address is blacklisted");
      });
    });
  });

  describe("Custodian", function () {
    describe("Token Freezing", function () {
      beforeEach(async function () {
        await myFirstDog.mint(user1.address, 10);
      });

      it("should allow freezing and unfreezing of tokens", async function () {
        await custodian.freeze(user1.address, 5);
        expect(await custodian.frozenBalance(user1.address)).to.equal(5);

        await custodian.unfreeze(user1.address, 5);
        expect(await custodian.frozenBalance(user1.address)).to.equal(0);
      });

      it("should revert if unfreezing more than frozen tokens", async function () {
        await custodian.freeze(user1.address, 5);
        await expect(custodian.unfreeze(user1.address, 10)).to.be.revertedWith(
          "Insufficient frozen balance",
        );
      });
    });
  });

  describe("Treasury", function () {
    it("should allow receiving ETH", async function () {
      const tx = await owner.sendTransaction({
        to: treasury.target,
        value: PRICE,
      });
      await tx.wait();
      expect(await treasury.getBalance()).to.equal(PRICE);
    });

    it("should allow withdrawals by TREASURY_MANAGER_ROLE", async function () {
      await treasury
        .connect(owner)
        .grantRole(
          await treasury.TREASURY_MANAGER_ROLE(),
          treasuryManager.address,
        );
      await owner.sendTransaction({ to: treasury.target, value: PRICE });

      const initialBalance = await ethers.provider.getBalance(
        treasuryManager.address,
      );
      await treasury
        .connect(treasuryManager)
        .withdraw(treasuryManager.address, PRICE);
      const finalBalance = await ethers.provider.getBalance(
        treasuryManager.address,
      );
      expect(finalBalance).to.be.gt(initialBalance);
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