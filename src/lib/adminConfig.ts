/**
 * Admin Configuration
 * 
 * This file contains the authorized admin wallet addresses for the BlockCoop application.
 * Only wallets listed here will have access to the Admin Page and admin functionality.
 */

// Authorized admin wallet addresses
export const AUTHORIZED_ADMIN_ADDRESSES = [
  '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // Primary Admin (Deployer)
  '0xfF81cBA6Da71c50cC3123b277e612C95895ABC67', // Additional Admin (Client Request)
  '0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8', // New Admin (BlockCoop Sacco Management)
  '0xD04edC3225cEF6e82e50Dc559d38733180743b94', // Safe Multisig (Treasury/Admin)
];

/**
 * Check if a wallet address is authorized as an admin
 * @param address - The wallet address to check
 * @returns boolean - True if the address is an authorized admin
 */
export function isAuthorizedAdmin(address: string | null | undefined): boolean {
  if (!address) {
    return false;
  }
  
  // Convert both addresses to lowercase for case-insensitive comparison
  const currentAddress = address.toLowerCase();
  return AUTHORIZED_ADMIN_ADDRESSES.some(adminAddress => 
    adminAddress.toLowerCase() === currentAddress
  );
}

/**
 * Get the list of authorized admin addresses
 * @returns string[] - Array of authorized admin addresses
 */
export function getAuthorizedAdminAddresses(): string[] {
  return [...AUTHORIZED_ADMIN_ADDRESSES];
}

/**
 * Check if admin functionality should be available
 * This can be extended in the future to include additional checks
 * like network validation, contract state, etc.
 * 
 * @param address - The wallet address to check
 * @param isConnected - Whether the wallet is connected
 * @returns boolean - True if admin functionality should be available
 */
export function shouldShowAdminFeatures(
  address: string | null | undefined, 
  isConnected: boolean
): boolean {
  return isConnected && isAuthorizedAdmin(address);
}
