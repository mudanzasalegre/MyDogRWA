// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface ITreasury {
    function getBalance() external view returns (uint256);
}

contract Allowlist is AccessControl {
    bytes32 public constant LIMITER_ROLE = keccak256("LIMITER_ROLE");
    mapping(address => bool) private _allowlist;
    mapping(address => bool) private _blacklist;

    uint256 private _allowPrice = 0.01 ether;
    ITreasury public treasury;

    event UserAllowed(address indexed user);
    event UserDisallowed(address indexed user);
    event UserBlacklisted(address indexed user);
    event UserUnBlacklisted(address indexed user);
    event AllowPriceUpdated(uint256 newPrice);

    constructor(address treasuryAddress) {
        require(
            treasuryAddress != address(0),
            "Treasury address cannot be zero"
        );
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIMITER_ROLE, msg.sender);
        _allowlist[msg.sender] = true;
        treasury = ITreasury(treasuryAddress);
    }

    function getAllowed() public payable {
        require(msg.value == _allowPrice, "Incorrect payment amount");
        require(!_blacklist[msg.sender], "Address is blacklisted");
        require(!_allowlist[msg.sender], "Address is already allowed");

        // Transferir fondos al Tesoro
        (bool success, ) = payable(address(treasury)).call{value: msg.value}(
            ""
        );
        require(success, "Transfer to Treasury failed");

        _allowlist[msg.sender] = true;
        emit UserAllowed(msg.sender);
    }

    function setAllowPrice(uint256 newPrice)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newPrice > 0, "Price must be greater than 0");
        _allowPrice = newPrice;
        emit AllowPriceUpdated(newPrice);
    }

    function getAllowPrice() public view returns (uint256) {
        return _allowPrice;
    }

    function blacklistUser(address user) public onlyRole(LIMITER_ROLE) {
        require(!_blacklist[user], "User already blacklisted");

        _blacklist[user] = true;
        _allowlist[user] = false;
        emit UserBlacklisted(user);
        emit UserDisallowed(user);
    }

    function unBlacklistUser(address user) public onlyRole(LIMITER_ROLE) {
        require(_blacklist[user], "User not blacklisted");

        _blacklist[user] = false;
        emit UserUnBlacklisted(user);
    }

    function isBlacklisted(address user) public view returns (bool) {
        return _blacklist[user];
    }

    function allowUser(address user) public onlyRole(LIMITER_ROLE) {
        require(!_blacklist[user], "Cannot allow blacklisted user");
        _allowlist[user] = true;
        emit UserAllowed(user);
    }

    function disallowUser(address user) public onlyRole(LIMITER_ROLE) {
        _allowlist[user] = false;
        emit UserDisallowed(user);
    }

    function isAllowed(address user) public view returns (bool) {
        return _allowlist[user];
    }
}
