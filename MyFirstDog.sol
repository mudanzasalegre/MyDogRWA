// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Custodian} from "./Custodian.sol";
import {Allowlist} from "./Allowlist.sol";

interface ITreasury {
    function getBalance() external view returns (uint256);
}

contract MyFirstDog is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    AccessControl
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant PRICE = 0.1 ether;

    mapping(address => bool) public hasPurchased;

    Custodian public custodianContract;
    Allowlist public allowlistContract;
    ITreasury public treasury;

    constructor(address allowlistAddress, address treasuryAddress)
        ERC20("MyFirstDog", "MFD")
        ERC20Permit("MyFirstDog")
    {
        require(allowlistAddress != address(0), "Allowlist cannot be zero");
        require(treasuryAddress != address(0), "Treasury cannot be zero");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        allowlistContract = Allowlist(allowlistAddress);
        treasury = ITreasury(treasuryAddress);

        _mint(msg.sender, 1); // Mint inicial
    }

    // ---- Inicializadores ----

    function initializeCustodian(address custodianAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(address(custodianContract) == address(0), "Custodian already set");
        require(custodianAddress != address(0), "Invalid custodian address");
        custodianContract = Custodian(custodianAddress);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ---- Compra de Tokens ----
    function buy() external payable {
        require(address(allowlistContract) != address(0), "Allowlist not initialized");
        require(address(treasury) != address(0), "Treasury not initialized");

        require(allowlistContract.isAllowed(msg.sender), "Allowlist: Not allowed");
        require(msg.value == PRICE, "Incorrect payment amount");
        require(!hasPurchased[msg.sender], "Already purchased");
        require(totalSupply() + 1 <= MAX_SUPPLY, "Max supply reached");

        // Enviar fondos al Tesoro
        (bool success, ) = payable(address(treasury)).call{value: msg.value}("");
        require(success, "Transfer to Treasury failed");

        hasPurchased[msg.sender] = true;
        _mint(msg.sender, 1);
    }

    // ---- Funcionalidad de Pausar ----
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---- Minting con Control de Rol ----
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        _mint(to, amount);
    }

    // ---- Overrides ----
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        uint256 totalBalance = balanceOf(from); // Balance total del usuario

        if (address(custodianContract) != address(0)) {
            uint256 frozenBalance = custodianContract.frozenBalance(from); // Balance congelado

            // Validar que el usuario tiene suficientes fondos no congelados
            require(
                totalBalance - frozenBalance >= value,
                "Custodian: Insufficient available balance"
            );
        }

        // Proceder con la transferencia si pasa todas las validaciones
        super._update(from, to, value);
    }
}
