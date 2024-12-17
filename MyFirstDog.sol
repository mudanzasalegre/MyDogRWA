// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Custodian} from "./Custodian.sol";
import {Allowlist} from "./Allowlist.sol";

contract MyFirstDog is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    AccessControl,
    ERC20Permit
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 1000; // Máximo de 1000 tokens
    uint256 public constant PRICE = 0.1 ether; // Precio de cada token
    mapping(address => bool) public hasPurchased; // Controla quién ya compró un token

    Custodian public custodianContract; // Instancia del contrato Custodian
    Allowlist public allowlistContract; // Instancia del contrato Allowlist

    bool private initialized; // Estado para controlar inicialización

    modifier initializer() {
        require(!initialized, "Already initialized");
        initialized = true;
        _;
    }

    constructor(address custodianAddress, address allowlistAddress)
        ERC20("MyFirstDog", "MFD")
        ERC20Permit("MyFirstDog")
    {
        require(
            custodianAddress != address(0),
            "Custodian address cannot be zero"
        );
        require(
            allowlistAddress != address(0),
            "Allowlist address cannot be zero"
        );

        _init();

        custodianContract = Custodian(custodianAddress); // Vincular contrato Custodian
        allowlistContract = Allowlist(allowlistAddress); // Vincular contrato Allowlist

        _mint(msg.sender, 1); // Mint inicial para el creador con 1 unidad
    }

    // Sobrescribir la función decimals para establecerla en 0
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function _init() internal initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // ---- Token Functions ----
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum supply");
        _mint(to, amount);
    }

    function buy() external payable {
        require(
            allowlistContract.isAllowed(msg.sender),
            "Allowlist: Not allowed"
        );
        require(msg.value >= PRICE, "Incorrect payment amount");
        require(!hasPurchased[msg.sender], "You can only purchase one token");
        require(totalSupply() + 1 <= MAX_SUPPLY, "Max supply reached");

        hasPurchased[msg.sender] = true;
        _mint(msg.sender, 1); // Cada compra da 1 token
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    // ---- Overrides ----
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
