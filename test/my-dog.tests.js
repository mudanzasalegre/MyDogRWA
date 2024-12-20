const { expect } = require("chai");
const { ethers } = require("hardhat");

const AddressZero = "0x0000000000000000000000000000000000000000"; // Definir manualmente si no existe en ethers.constants

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
            owner.address
          )
        ).to.be.true;
        expect(
          await myFirstDog.hasRole(
            await myFirstDog.MINTER_ROLE(),
            owner.address
          )
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
          myFirstDog.connect(user2).buy({ value: PRICE })
        ).to.be.revertedWith("Allowlist: Not allowed");
      });

      it("should revert if user has already purchased", async function () {
        await myFirstDog.connect(user1).buy({ value: PRICE });
        await expect(
          myFirstDog.connect(user1).buy({ value: PRICE })
        ).to.be.revertedWith("Already purchased");
      });


      it("should revert if incorrect ETH amount is sent", async function () {
        await expect(
          myFirstDog.connect(user1).buy({ value: ethers.parseEther("0.05") })
        ).to.be.revertedWith("Incorrect payment amount");
      });

      it("should revert if maximum supply is reached", async function () {
        // Paso 1: Verificar el suministro inicial
        const initialSupply = (await myFirstDog.totalSupply()).toString();
        console.log("Initial Supply:", initialSupply);

        // Paso 2: Calcular el suministro restante
        const remainingSupply = MAX_SUPPLY - parseInt(initialSupply);
        console.log("Remaining Supply:", remainingSupply);

        // Paso 3: Permitir compras hasta alcanzar el límite máximo
        for (let i = 0; i < remainingSupply; i++) {
          const tempSigner = signers[i + 4]; // Empezar después de los primeros 4 signers
          await allowlist.allowUser(tempSigner.address);

          await owner.sendTransaction({
            to: tempSigner.address,
            value: PRICE,
          });

          await myFirstDog.connect(tempSigner).buy({ value: PRICE });
        }

        // Confirmar que el suministro actual alcanza el máximo
        const currentSupply = (await myFirstDog.totalSupply()).toString();
        console.log("Current Supply:", currentSupply);
        expect(parseInt(currentSupply)).to.equal(MAX_SUPPLY);

        // Paso 4: Intentar superar el máximo
        await allowlist.allowUser(user1.address);
        await expect(
          myFirstDog.connect(user1).buy({ value: PRICE })
        ).to.be.revertedWith("Max supply reached");
      });

      it("should emit Transfer event on successful purchase", async function () {
        await expect(myFirstDog.connect(user1).buy({ value: PRICE }))
          .to.emit(myFirstDog, "Transfer")
          .withArgs(AddressZero, user1.address, 1);
      });

    });

    describe("Pausable", function () {
      it("should allow pausing and unpausing by PAUSER_ROLE", async function () {
        await allowlist.allowUser(user1.address);

        await myFirstDog.pause();
        expect(await myFirstDog.paused()).to.be.true;

        await expect(
          myFirstDog.connect(user1).buy({ value: PRICE })
        ).to.be.revertedWithCustomError(myFirstDog, "EnforcedPause");

        await myFirstDog.unpause();
        expect(await myFirstDog.paused()).to.be.false;

        await myFirstDog.connect(user1).buy({ value: PRICE });
        expect(await myFirstDog.balanceOf(user1.address)).to.equal(1);
      });

      it("should emit Paused and Unpaused events", async function () {
        await expect(myFirstDog.pause()).to.emit(myFirstDog, "Paused").withArgs(owner.address);
        await expect(myFirstDog.unpause()).to.emit(myFirstDog, "Unpaused").withArgs(owner.address);
      });

      it("should revert if non-PAUSER_ROLE tries to pause", async function () {
        await expect(myFirstDog.connect(user1).pause()).to.be.revertedWithCustomError(
          myFirstDog,
          "AccessControlUnauthorizedAccount"
        );
      });
    });

    describe("Minting", function () {
      it("should allow minting by MINTER_ROLE", async function () {
        await myFirstDog.mint(user1.address, 10);
        expect(await myFirstDog.balanceOf(user1.address)).to.equal(10);
      });

      it("should revert if minting exceeds MAX_SUPPLY", async function () {
        await expect(
          myFirstDog.mint(user1.address, MAX_SUPPLY + 1)
        ).to.be.revertedWith("Exceeds maximum supply");
      });

      it("should revert if non-MINTER_ROLE tries to mint", async function () {
        await expect(
          myFirstDog.connect(user1).mint(user2.address, 10)
        ).to.be.revertedWithCustomError(myFirstDog, "AccessControlUnauthorizedAccount");
      });
    });

    describe("Roles and Permissions", function () {
      it("should allow only DEFAULT_ADMIN_ROLE to assign roles", async function () {
        await expect(
          myFirstDog
            .connect(user1)
            .grantRole(await myFirstDog.MINTER_ROLE(), user1.address)
        ).to.be.revertedWithCustomError(myFirstDog, "AccessControlUnauthorizedAccount");

        await myFirstDog.grantRole(await myFirstDog.MINTER_ROLE(), user1.address);
        expect(
          await myFirstDog.hasRole(await myFirstDog.MINTER_ROLE(), user1.address)
        ).to.be.true;
      });

      it("should revert protected functions if called by unauthorized users", async function () {
        await expect(myFirstDog.connect(user1).pause()).to.be.revertedWithCustomError(
          myFirstDog,
          "AccessControlUnauthorizedAccount"
        );
      });
    });
  });

  describe("Allowlist", function () {
    describe("User Management", function () {
      it("should allow a user to register on the Allowlist", async function () {
        const tx = await allowlist.connect(user1).getAllowed({ value: ALLOW_PRICE });

        // Verificar que el evento UserAllowed se emitió
        await expect(tx)
          .to.emit(allowlist, "UserAllowed")
          .withArgs(user1.address);

        // Verificar que el usuario está en la Allowlist
        expect(await allowlist.isAllowed(user1.address)).to.be.true;
      });

      it("should revert if user is blacklisted", async function () {
        // Poner al usuario en la lista negra
        const tx = await allowlist.blacklistUser(user1.address);

        // Verificar que el evento UserBlacklisted se emitió
        await expect(tx)
          .to.emit(allowlist, "UserBlacklisted")
          .withArgs(user1.address);

        // Intentar registrarse debería fallar
        await expect(
          allowlist.connect(user1).getAllowed({ value: ALLOW_PRICE })
        ).to.be.revertedWith("Address is blacklisted");
      });

      it("should allow removing a user from the blacklist", async function () {
        await allowlist.blacklistUser(user1.address);

        // Eliminar de la blacklist
        const tx = await allowlist.unBlacklistUser(user1.address);

        // Verificar que el evento UserUnBlacklisted se emitió
        await expect(tx)
          .to.emit(allowlist, "UserUnBlacklisted")
          .withArgs(user1.address);

        // Verificar que el usuario no está en la blacklist
        expect(await allowlist.isBlacklisted(user1.address)).to.be.false;
      });

      it("should allow updating the Allowlist price", async function () {
        const newPrice = ethers.parseEther("0.02");

        // Actualizar el precio de la Allowlist
        const tx = await allowlist.setAllowPrice(newPrice);

        // Verificar que el evento AllowPriceUpdated se emitió
        await expect(tx)
          .to.emit(allowlist, "AllowPriceUpdated")
          .withArgs(newPrice);

        // Verificar que el precio se actualizó
        expect(await allowlist.getAllowPrice()).to.equal(newPrice);
      });

      it("should revert if non-admin tries to update Allowlist price", async function () {
        const newPrice = ethers.parseEther("0.02");

        // Intentar actualizar el precio desde un usuario sin permisos
        await expect(
          allowlist.connect(user1).setAllowPrice(newPrice)
        ).to.be.revertedWithCustomError(
          allowlist,
          "AccessControlUnauthorizedAccount"
        );
      });

      it("should revert if payment amount is incorrect", async function () {
        // Intentar registrarse con un pago incorrecto
        await expect(
          allowlist.connect(user1).getAllowed({ value: ethers.parseEther("0.005") })
        ).to.be.revertedWith("Incorrect payment amount");
      });
    });

    describe("Event Emission", function () {
      it("should emit UserAllowed event when a user is added to the Allowlist", async function () {
        const tx = await allowlist.connect(user1).getAllowed({ value: ALLOW_PRICE });
        await expect(tx)
          .to.emit(allowlist, "UserAllowed")
          .withArgs(user1.address);
      });

      it("should emit UserBlacklisted event when a user is blacklisted", async function () {
        const tx = await allowlist.blacklistUser(user1.address);
        await expect(tx)
          .to.emit(allowlist, "UserBlacklisted")
          .withArgs(user1.address);
      });

      it("should emit UserUnBlacklisted event when a user is removed from the blacklist", async function () {
        await allowlist.blacklistUser(user1.address);
        const tx = await allowlist.unBlacklistUser(user1.address);
        await expect(tx)
          .to.emit(allowlist, "UserUnBlacklisted")
          .withArgs(user1.address);
      });

      it("should emit AllowPriceUpdated event when the price is updated", async function () {
        const newPrice = ethers.parseEther("0.02");
        const tx = await allowlist.setAllowPrice(newPrice);
        await expect(tx)
          .to.emit(allowlist, "AllowPriceUpdated")
          .withArgs(newPrice);
      });
    });
  });

  describe("Custodian", function () {
    beforeEach(async function () {
      // Mint tokens para el usuario antes de cada prueba
      await myFirstDog.mint(user1.address, 10);
    });

    describe("Token Freezing and Unfreezing", function () {
      it("should allow freezing and unfreezing of tokens", async function () {
        await custodian.freeze(user1.address, 5);
        expect(await custodian.frozenBalance(user1.address)).to.equal(5);

        await custodian.unfreeze(user1.address, 5);
        expect(await custodian.frozenBalance(user1.address)).to.equal(0);
      });

      it("should revert if unfreezing more than frozen tokens", async function () {
        await custodian.freeze(user1.address, 5);
        await expect(custodian.unfreeze(user1.address, 10)).to.be.revertedWith(
          "Insufficient frozen balance"
        );
      });

      it("should not allow freezing more tokens than the user has available", async function () {
        await expect(custodian.freeze(user1.address, 15)).to.be.revertedWith(
          "Custodian: Insufficient available balance"
        );
      });

      it("should not allow unfreezing more tokens than are frozen", async function () {
        await custodian.freeze(user1.address, 5);
        await expect(custodian.unfreeze(user1.address, 10)).to.be.revertedWith(
          "Insufficient frozen balance"
        );
      });
    });

    describe("Contract Initialization", function () {
      it("should not allow setting the token contract more than once", async function () {
        await expect(
          custodian.setTokenContract(myFirstDog.target)
        ).to.be.revertedWith("Token contract already set");
      });

      it("should revert freezing if token contract is not set", async function () {
        const Custodian = await ethers.getContractFactory("Custodian");
        const newCustodian = await Custodian.deploy();

        await expect(newCustodian.freeze(user1.address, 5)).to.be.revertedWith(
          "Token contract not set"
        );
      });

      it("should revert unfreezing if token contract is not set", async function () {
        const Custodian = await ethers.getContractFactory("Custodian");
        const newCustodian = await Custodian.deploy();

        await expect(newCustodian.unfreeze(user1.address, 5)).to.be.revertedWith(
          "Token contract not set"
        );
      });
    });

    describe("Balance Queries", function () {
      it("should return correct available balance considering frozen tokens", async function () {
        await custodian.freeze(user1.address, 5);

        const availableBalance = await custodian.availableBalance(user1.address);
        expect(availableBalance).to.equal(5); // 10 - 5 tokens congelados
      });

      it("should return full balance if no tokens are frozen", async function () {
        const availableBalance = await custodian.availableBalance(user1.address);
        expect(availableBalance).to.equal(10); // Todos los tokens disponibles
      });

      it("should return zero available balance if all tokens are frozen", async function () {
        await custodian.freeze(user1.address, 10);

        const availableBalance = await custodian.availableBalance(user1.address);
        expect(availableBalance).to.equal(0); // Todos los tokens están congelados
      });
    });
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
        await expect(
          treasury.connect(user1).withdraw(user1.address, PRICE)
        ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount").withArgs(
          user1.address,
          await treasury.TREASURY_MANAGER_ROLE()
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
    it("should allow a user to register, buy a token, and verify balance", async function () {
      // Paso 1: Registrar al usuario en la allowlist
      await allowlist.allowUser(user1.address);
      const isAllowed = await allowlist.isAllowed(user1.address);
      expect(isAllowed).to.be.true;

      // Paso 2: Comprar un token
      await myFirstDog.connect(user1).buy({ value: PRICE });

      // Paso 3: Verificar el balance del usuario
      const balance = await myFirstDog.balanceOf(user1.address);
      expect(balance).to.equal(1);
    });

    it("should allow tokens to be frozen and unfrozen by Custodian", async function () {
      // Paso 1: Registrar al usuario y realizar la compra
      await allowlist.allowUser(user1.address);
      await myFirstDog.connect(user1).buy({ value: PRICE });

      // Paso 2: Congelar el token adquirido
      await custodian.freeze(user1.address, 1);
      const frozenBalance = await custodian.frozenBalance(user1.address);
      expect(frozenBalance).to.equal(1);

      // Paso 3: Descongelar el token
      await custodian.unfreeze(user1.address, 1);
      const unfrozenBalance = await custodian.frozenBalance(user1.address);
      expect(unfrozenBalance).to.equal(0);
    });

    it("should ensure funds are transferred to Treasury and can be withdrawn", async function () {
      // Paso 1: Obtener balance inicial del contrato Treasury
      const initialTreasuryBalance = await treasury.getBalance();

      // Paso 2: Registrar al usuario y realizar la compra
      await allowlist.allowUser(user1.address);
      await myFirstDog.connect(user1).buy({ value: PRICE });

      // Paso 3: Verificar que los fondos han sido transferidos al Tesoro
      const finalTreasuryBalance = await treasury.getBalance();
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + PRICE);

      // Paso 4: Retirar fondos del Tesoro
      await treasury.withdraw(owner.address, finalTreasuryBalance);
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      expect(ownerBalance).to.be.above(initialTreasuryBalance); // Confirmar que el dueño recibe los fondos
    });

    it("should revert key functions under adverse conditions", async function () {
      // Paso 1: Desplegar el contrato FailingTreasury
      const FailingTreasury = await ethers.getContractFactory("FailingTreasury");
      const failingTreasury = await FailingTreasury.deploy();
      await failingTreasury.waitForDeployment();

      // Paso 2: Desplegar MyFirstDog con FailingTreasury
      const failingMyFirstDog = await MyFirstDog.deploy(allowlist.target, failingTreasury.target);
      await failingMyFirstDog.waitForDeployment();

      // Paso 3: Intentar comprar y confirmar que falla
      await allowlist.allowUser(user1.address);
      await expect(
        failingMyFirstDog.connect(user1).buy({ value: PRICE })
      ).to.be.revertedWith("Transfer to Treasury failed");
    });
  });

  describe("Security", function () {
    describe("Reentrancy Protection", function () {
      it("should prevent reentrancy attacks during fund transfers", async function () {
        // 1. Despliegas MyFirstDog y su Treasury
        // 2. Despliegas ReentrantContract apuntando a MyFirstDog
        // 3. Llamas a attacker.attack({ value: ethers.utils.parseEther('0.1') })

        let error = null;
        try {
          await reentrantContract.connect(attacker).attack({ value: ethers.utils.parseEther('0.1') });
        } catch (err) {
          error = err;
        }

        expect(error).to.not.be.null;  // <--- FALLA porque 'error' es null
      });



    });

    describe("Unauthorized Role Access", function () {
      it("should prevent unauthorized users from calling protected functions", async function () {
        await expect(myFirstDog.connect(user1).pause()).to.be.revertedWithCustomError(
          myFirstDog,
          "AccessControlUnauthorizedAccount"
        );

        await expect(myFirstDog.connect(user1).mint(user2.address, 10)).to.be.revertedWithCustomError(
          myFirstDog,
          "AccessControlUnauthorizedAccount"
        );

        const newPrice = ethers.parseEther("0.02");
        await expect(
          allowlist.connect(user1).setAllowPrice(newPrice)
        ).to.be.revertedWithCustomError(
          allowlist,
          "AccessControlUnauthorizedAccount"
        );
      });
    });
  });
});