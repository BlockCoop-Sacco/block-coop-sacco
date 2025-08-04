import { 
  isAuthorizedAdmin, 
  shouldShowAdminFeatures, 
  getAuthorizedAdminAddresses,
  AUTHORIZED_ADMIN_ADDRESSES 
} from '../adminConfig';

describe('adminConfig', () => {
  const primaryAdmin = '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4';
  const additionalAdmin = '0x6F6782148F208F9547f68e2354B1d7d2d4BeF987';
  const unauthorizedAddress = '0x1234567890123456789012345678901234567890';

  describe('isAuthorizedAdmin', () => {
    it('should return true for primary admin address', () => {
      expect(isAuthorizedAdmin(primaryAdmin)).toBe(true);
    });

    it('should return true for additional admin address', () => {
      expect(isAuthorizedAdmin(additionalAdmin)).toBe(true);
    });

    it('should return true for admin addresses in different case', () => {
      expect(isAuthorizedAdmin(primaryAdmin.toLowerCase())).toBe(true);
      expect(isAuthorizedAdmin(primaryAdmin.toUpperCase())).toBe(true);
    });

    it('should return false for unauthorized address', () => {
      expect(isAuthorizedAdmin(unauthorizedAddress)).toBe(false);
    });

    it('should return false for null or undefined address', () => {
      expect(isAuthorizedAdmin(null)).toBe(false);
      expect(isAuthorizedAdmin(undefined)).toBe(false);
      expect(isAuthorizedAdmin('')).toBe(false);
    });
  });

  describe('shouldShowAdminFeatures', () => {
    it('should return true when connected with authorized admin address', () => {
      expect(shouldShowAdminFeatures(primaryAdmin, true)).toBe(true);
      expect(shouldShowAdminFeatures(additionalAdmin, true)).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(shouldShowAdminFeatures(primaryAdmin, false)).toBe(false);
    });

    it('should return false when connected with unauthorized address', () => {
      expect(shouldShowAdminFeatures(unauthorizedAddress, true)).toBe(false);
    });

    it('should return false when not connected and no address', () => {
      expect(shouldShowAdminFeatures(null, false)).toBe(false);
    });
  });

  describe('getAuthorizedAdminAddresses', () => {
    it('should return a copy of authorized admin addresses', () => {
      const addresses = getAuthorizedAdminAddresses();
      expect(addresses).toEqual(AUTHORIZED_ADMIN_ADDRESSES);
      expect(addresses).not.toBe(AUTHORIZED_ADMIN_ADDRESSES); // Should be a copy
    });

    it('should contain the expected admin addresses', () => {
      const addresses = getAuthorizedAdminAddresses();
      expect(addresses).toContain(primaryAdmin);
      expect(addresses).toContain(additionalAdmin);
      expect(addresses).toHaveLength(2);
    });
  });
});
