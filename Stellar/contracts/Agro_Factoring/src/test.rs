#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token::{self, TokenClient},
    Address, Env,
};

use super::{Contract, ContractClient, ContractError, EscrowData, EscrowStatus};

// ------------------------------------------------------------------
// Test harness - registers the escrow contract and a real Stellar Asset
// Contract (SAC) used as the USDC stand-in. The escrow takes custody of
// the full crop amount during init and releases it phase by phase.
// ------------------------------------------------------------------

#[allow(dead_code)]
struct TestEnv {
    env: Env,
    contract_addr: Address,
    token_addr: Address,
    admin: Address,
    exporter: Address,
    farmer: Address,
    crop_id: u64,
    total: i128,
    per_phase: i128,
}

impl TestEnv {
    // Client for the escrow contract.
    fn escrow(&self) -> ContractClient<'_> {
        ContractClient::new(&self.env, &self.contract_addr)
    }

    // SEP-41 token client (balance / transfer) for the USDC stand-in.
    fn token(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.token_addr)
    }

    // Admin client (mint) for the USDC stand-in.
    fn token_admin(&self) -> token::StellarAssetClient<'_> {
        token::StellarAssetClient::new(&self.env, &self.token_addr)
    }
}

// Build a fully initialized escrow: admin set, USDC configured, `total`
// minted to the exporter, and init() called so the contract holds custody.
fn setup(total: i128, per_phase: i128, crop_id: u64) -> TestEnv {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let exporter = Address::generate(&env);
    let farmer = Address::generate(&env);

    // Deploy escrow contract with admin as constructor argument.
    let contract_addr = env.register(Contract, (&admin,));

    // Deploy a Stellar Asset Contract to act as USDC.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    let t = TestEnv {
        env,
        contract_addr,
        token_addr,
        admin,
        exporter,
        farmer,
        crop_id,
        total,
        per_phase,
    };

    // Configure USDC on the escrow and fund the exporter.
    t.escrow().set_usdc(&t.token_addr);
    t.token_admin().mint(&t.exporter, &total);

    // Initialize the escrow (takes custody of `total` from the exporter).
    let _ = t.escrow().init(&t.exporter, &t.farmer, &t.crop_id, &total, &per_phase);

    t
}

// Deploy escrow + token and configure USDC, but do NOT call init.
// Useful for exercising init error paths.
fn setup_no_init() -> TestEnv {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let exporter = Address::generate(&env);
    let farmer = Address::generate(&env);

    let contract_addr = env.register(Contract, (&admin,));
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    let t = TestEnv {
        env,
        contract_addr,
        token_addr,
        admin,
        exporter,
        farmer,
        crop_id: 1,
        total: 5000,
        per_phase: 1000,
    };

    t.escrow().set_usdc(&t.token_addr);
    t.token_admin().mint(&t.exporter, &t.total);
    t
}

// ==================================================================
// Constructor / set_usdc tests
// ==================================================================

#[test]
fn test_set_usdc_works() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_addr = env.register(Contract, (&admin,));
    let client = ContractClient::new(&env, &contract_addr);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    // Admin is mocked, so set_usdc should succeed.
    let res = client.try_set_usdc(&token_addr);
    assert!(res.is_ok());
}

#[test]
fn test_set_usdc_unauthorized() {
    let env = Env::default();
    // No mock_all_auths -> require_auth will fail (panic).

    let admin = Address::generate(&env);
    let contract_addr = env.register(Contract, (&admin,));
    let client = ContractClient::new(&env, &contract_addr);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    // set_usdc -> require_admin -> admin.require_auth() -> panic.
    let res = client.try_set_usdc(&token_addr);
    assert!(res.is_err());
}

// ==================================================================
// init tests
// ==================================================================

#[test]
fn test_init_success() {
    let t = setup(5000, 1000, 1);

    // Contract took custody of the full amount from the exporter.
    assert_eq!(t.token().balance(&t.contract_addr), 5000);
    assert_eq!(t.token().balance(&t.exporter), 0);

    // Escrow state should be Active with no phases released yet.
    let state = t.escrow().get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(state.status, EscrowStatus::Active);
    assert_eq!(state.current_phase, 0);
    assert_eq!(state.released_amount, 0);
    assert_eq!(state.total_amount, 5000);
    assert_eq!(state.amount_per_phase, 1000);
}

#[test]
fn test_init_invalid_amount_zero() {
    let t = setup_no_init();
    let res = t.escrow().try_init(&t.exporter, &t.farmer, &1, &0, &1000);
    assert_eq!(res, Err(Ok(ContractError::InvalidAmount)));
}

#[test]
fn test_init_invalid_amount_negative() {
    let t = setup_no_init();
    let res = t
        .escrow()
        .try_init(&t.exporter, &t.farmer, &1, &5000, &(-1));
    assert_eq!(res, Err(Ok(ContractError::InvalidAmount)));
}

#[test]
fn test_init_not_divisible() {
    let t = setup_no_init();
    let res = t
        .escrow()
        .try_init(&t.exporter, &t.farmer, &1, &5000, &3000);
    assert_eq!(res, Err(Ok(ContractError::InvalidAmount)));
}

#[test]
fn test_init_already_initialized() {
    let t = setup(5000, 1000, 1);

    // Crop 1 already exists; a second init for the same id must fail.
    let res = t
        .escrow()
        .try_init(&t.exporter, &t.farmer, &1, &5000, &1000);
    assert_eq!(res, Err(Ok(ContractError::AlreadyInitialized)));
}

#[test]
fn test_init_usdc_not_configured() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let exporter = Address::generate(&env);
    let farmer = Address::generate(&env);

    // Deploy escrow but do NOT call set_usdc.
    let contract_addr = env.register(Contract, (&admin,));
    let client = ContractClient::new(&env, &contract_addr);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let token_admin = token::StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&exporter, &5000);

    let res = client.try_init(&exporter, &farmer, &1, &5000, &1000);
    assert_eq!(res, Err(Ok(ContractError::UsdcNotConfigured)));
}

#[test]
fn test_init_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let exporter = Address::generate(&env);
    let farmer = Address::generate(&env);

    let contract_addr = env.register(Contract, (&admin,));
    let client = ContractClient::new(&env, &contract_addr);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let token_admin = token::StellarAssetClient::new(&env, &token_addr);

    // Configure USDC and fund the exporter while auth is still mocked.
    client.set_usdc(&token_addr);
    token_admin.mint(&exporter, &5000);

    // Disable auth mocking so exporter.require_auth() inside init will fail.
    env.set_auths(&[]);

    let res = client.try_init(&exporter, &farmer, &1, &5000, &1000);
    assert!(res.is_err());
}

// ==================================================================
// release_phase tests
// ==================================================================

#[test]
fn test_release_phase_success() {
    let t = setup(5000, 1000, 1);

    // Release phase 1 -> farmer receives 1000, contract drops by 1000.
    t.escrow().release_phase(&1, &1);

    let state = t.escrow().get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(state.current_phase, 1);
    assert_eq!(state.released_amount, 1000);
    assert_eq!(state.status, EscrowStatus::Active);

    assert_eq!(t.token().balance(&t.farmer), 1000);
    assert_eq!(t.token().balance(&t.contract_addr), 4000);
}

#[test]
fn test_release_all_phases_completes() {
    let t = setup(5000, 1000, 1);

    for phase in 1..=5u32 {
        t.escrow().release_phase(&1, &phase);
    }

    let state = t.escrow().get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(state.current_phase, 5);
    assert_eq!(state.released_amount, 5000);
    assert_eq!(state.status, EscrowStatus::Completed);

    // Farmer received everything, contract holds nothing.
    assert_eq!(t.token().balance(&t.farmer), 5000);
    assert_eq!(t.token().balance(&t.contract_addr), 0);
}

#[test]
fn test_release_phase_when_frozen() {
    let t = setup(5000, 1000, 1);

    // Freeze the escrow via admin (auth mocked).
    t.escrow().trigger_disaster(&t.exporter, &t.farmer, &1);

    let res = t.escrow().try_release_phase(&1, &1);
    assert_eq!(res, Err(Ok(ContractError::EscrowFrozen)));

    // Farmer should have received nothing.
    assert_eq!(t.token().balance(&t.farmer), 0);
}

#[test]
fn test_release_phase_out_of_order() {
    let t = setup(5000, 1000, 1);

    // Try to release phase 2 before phase 1.
    let res = t.escrow().try_release_phase(&1, &2);
    assert_eq!(res, Err(Ok(ContractError::InvalidPhase)));
}

#[test]
fn test_release_when_completed() {
    let t = setup(5000, 1000, 1);

    for phase in 1..=5u32 {
        t.escrow().release_phase(&1, &phase);
    }

    // Try to release a 6th phase once Completed.
    let res = t.escrow().try_release_phase(&1, &6);
    assert_eq!(res, Err(Ok(ContractError::InvalidPhase)));
}

#[test]
fn test_release_phase_not_found() {
    let t = setup(5000, 1000, 1);

    // crop_id 999 has no escrow.
    let res = t.escrow().try_release_phase(&999, &1);
    assert_eq!(res, Err(Ok(ContractError::EscrowNotFound)));
}

#[test]
fn test_release_phase_unauthorized() {
    let t = setup(5000, 1000, 1);

    // Disable auth mocking so exporter.require_auth() inside release fails.
    t.env.set_auths(&[]);

    let res = t.escrow().try_release_phase(&1, &1);
    assert!(res.is_err());
}

// ==================================================================
// trigger_disaster tests
// ==================================================================

#[test]
fn test_trigger_disaster_success() {
    let t = setup(5000, 1000, 1);

    // Contract still holds all funds before the disaster.
    assert_eq!(t.token().balance(&t.contract_addr), 5000);

    t.escrow().trigger_disaster(&t.exporter, &t.farmer, &1);

    let state = t.escrow().get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(state.status, EscrowStatus::Frozen);

    // A frozen escrow cannot release funds; verify nothing moved.
    assert_eq!(t.token().balance(&t.contract_addr), 5000);
    assert_eq!(t.token().balance(&t.farmer), 0);
}

#[test]
fn test_trigger_disaster_party_mismatch() {
    let t = setup(5000, 1000, 1);

    let wrong_farmer = Address::generate(&t.env);

    let res = t
        .escrow()
        .try_trigger_disaster(&t.exporter, &wrong_farmer, &1);
    assert_eq!(res, Err(Ok(ContractError::PartyMismatch)));
}

#[test]
fn test_trigger_disaster_not_found() {
    let t = setup(5000, 1000, 1);

    let res = t
        .escrow()
        .try_trigger_disaster(&t.exporter, &t.farmer, &999);
    assert_eq!(res, Err(Ok(ContractError::EscrowNotFound)));
}

#[test]
fn test_trigger_disaster_unauthorized() {
    let t = setup(5000, 1000, 1);

    // Disable auth mocking so admin.require_auth() inside trigger fails.
    t.env.set_auths(&[]);

    let res = t
        .escrow()
        .try_trigger_disaster(&t.exporter, &t.farmer, &1);
    assert!(res.is_err());
}

// ==================================================================
// reset_escrow tests
// ==================================================================

#[test]
fn test_reset_escrow_full_refund() {
    let t = setup(5000, 1000, 1);

    // No phases released yet -> full 5000 should return to exporter.
    assert_eq!(t.token().balance(&t.contract_addr), 5000);
    assert_eq!(t.token().balance(&t.exporter), 0);

    t.escrow().reset_escrow(&1);

    // Exporter got all funds back, contract holds nothing.
    assert_eq!(t.token().balance(&t.exporter), 5000);
    assert_eq!(t.token().balance(&t.contract_addr), 0);

    // Escrow no longer exists.
    let res = t.escrow().try_get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(res, Err(Ok(ContractError::EscrowNotFound)));
}

#[test]
fn test_reset_escrow_partial_refund() {
    let t = setup(5000, 1000, 1);

    // Release 2 phases (2000 to farmer), then reset.
    t.escrow().release_phase(&1, &1);
    t.escrow().release_phase(&1, &2);

    assert_eq!(t.token().balance(&t.farmer), 2000);
    assert_eq!(t.token().balance(&t.contract_addr), 3000);

    t.escrow().reset_escrow(&1);

    // Remaining 3000 returned to exporter.
    assert_eq!(t.token().balance(&t.exporter), 3000);
    assert_eq!(t.token().balance(&t.contract_addr), 0);
    // Farmer keeps what was already released.
    assert_eq!(t.token().balance(&t.farmer), 2000);
}

#[test]
fn test_reset_escrow_allows_reinit() {
    let t = setup(5000, 1000, 1);

    t.escrow().reset_escrow(&1);

    // Exporter now has 5000 back; re-init with same crop_id should work.
    let res = t.escrow().try_init(&t.exporter, &t.farmer, &1, &5000, &1000);
    assert!(res.is_ok());

    let state = t.escrow().get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(state.current_phase, 0);
    assert_eq!(state.status, EscrowStatus::Active);
}

#[test]
fn test_reset_escrow_when_frozen() {
    let t = setup(5000, 1000, 1);

    t.escrow().trigger_disaster(&t.exporter, &t.farmer, &1);

    // Reset should still work on frozen escrows.
    t.escrow().reset_escrow(&1);

    assert_eq!(t.token().balance(&t.exporter), 5000);

    let res = t.escrow().try_get_escrow_state(&t.exporter, &t.farmer, &1);
    assert_eq!(res, Err(Ok(ContractError::EscrowNotFound)));
}

#[test]
fn test_reset_escrow_not_found() {
    let t = setup(5000, 1000, 1);

    let res = t.escrow().try_reset_escrow(&999);
    assert_eq!(res, Err(Ok(ContractError::EscrowNotFound)));
}

#[test]
fn test_reset_escrow_unauthorized() {
    let t = setup(5000, 1000, 1);

    // Disable auth mocking so admin.require_auth() fails.
    t.env.set_auths(&[]);

    let res = t.escrow().try_reset_escrow(&1);
    assert!(res.is_err());
}

// ==================================================================
// get_escrow_state tests
// ==================================================================

#[test]
fn test_get_escrow_state_success() {
    let t = setup(5000, 1000, 42);

    let state: EscrowData = t.escrow().get_escrow_state(&t.exporter, &t.farmer, &42);

    assert_eq!(state.exporter, t.exporter);
    assert_eq!(state.farmer, t.farmer);
    assert_eq!(state.crop_id, 42);
    assert_eq!(state.total_amount, 5000);
    assert_eq!(state.amount_per_phase, 1000);
    assert_eq!(state.current_phase, 0);
    assert_eq!(state.released_amount, 0);
    assert_eq!(state.status, EscrowStatus::Active);
}

#[test]
fn test_get_escrow_state_party_mismatch() {
    let t = setup(5000, 1000, 1);

    let wrong_exporter = Address::generate(&t.env);

    let res = t
        .escrow()
        .try_get_escrow_state(&wrong_exporter, &t.farmer, &1);
    assert_eq!(res, Err(Ok(ContractError::PartyMismatch)));
}

#[test]
fn test_get_escrow_state_not_found() {
    let t = setup(5000, 1000, 1);

    let res = t
        .escrow()
        .try_get_escrow_state(&t.exporter, &t.farmer, &999);
    assert_eq!(res, Err(Ok(ContractError::EscrowNotFound)));
}