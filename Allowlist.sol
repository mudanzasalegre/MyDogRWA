// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Allowlist is AccessControl {
    bytes32 public constant LIMITER_ROLE = keccak256("LIMITER_ROLE");
    mapping(address => bool) private _allowlist;

    event UserAllowed(address indexed user);
    event UserDisallowed(address indexed user);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIMITER_ROLE, msg.sender);
        _allowlist[msg.sender] = true;
        emit UserAllowed(msg.sender);
    }

    function allowUser(address user) public onlyRole(LIMITER_ROLE) {
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
