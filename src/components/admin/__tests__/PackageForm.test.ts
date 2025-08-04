// Test file for PackageForm conversion functions
// This tests the helper functions used in PackageForm component

// Helper functions (copied from PackageForm for testing)
const bpsToPercentage = (bps: number): string => {
  return (bps / 100).toString();
};

const percentageToBps = (percentage: string): number => {
  return Math.round(parseFloat(percentage || '0') * 100);
};

const secondsToTimeUnits = (seconds: number): { years: string; months: string; days: string } => {
  const totalDays = Math.floor(seconds / (24 * 3600));
  const years = Math.floor(totalDays / 365);
  const remainingDays = totalDays % 365;
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;
  
  return {
    years: years.toString(),
    months: months.toString(),
    days: days.toString(),
  };
};

const timeUnitsToSeconds = (years: string, months: string, days: string): number => {
  const y = parseInt(years || '0');
  const m = parseInt(months || '0');
  const d = parseInt(days || '0');
  
  return (y * 365 + m * 30 + d) * 24 * 3600;
};

// Test cases
describe('PackageForm Helper Functions', () => {
  describe('bpsToPercentage', () => {
    test('converts BPS to percentage correctly', () => {
      expect(bpsToPercentage(7000)).toBe('70');
      expect(bpsToPercentage(200)).toBe('2');
      expect(bpsToPercentage(10000)).toBe('100');
      expect(bpsToPercentage(0)).toBe('0');
    });
  });

  describe('percentageToBps', () => {
    test('converts percentage to BPS correctly', () => {
      expect(percentageToBps('70')).toBe(7000);
      expect(percentageToBps('2')).toBe(200);
      expect(percentageToBps('100')).toBe(10000);
      expect(percentageToBps('0')).toBe(0);
      expect(percentageToBps('2.5')).toBe(250);
    });
  });

  describe('secondsToTimeUnits', () => {
    test('converts seconds to time units correctly', () => {
      // 1 year = 365 * 24 * 3600 = 31,536,000 seconds
      const oneYear = secondsToTimeUnits(31536000);
      expect(oneYear).toEqual({ years: '1', months: '0', days: '0' });

      // 5 years = 5 * 365 * 24 * 3600 = 157,680,000 seconds
      const fiveYears = secondsToTimeUnits(157680000);
      expect(fiveYears).toEqual({ years: '5', months: '0', days: '0' });

      // Test mixed units
      const mixed = secondsToTimeUnits(31536000 + 30 * 24 * 3600 + 5 * 24 * 3600); // 1 year + 1 month + 5 days
      expect(mixed).toEqual({ years: '1', months: '1', days: '5' });
    });
  });

  describe('timeUnitsToSeconds', () => {
    test('converts time units to seconds correctly', () => {
      expect(timeUnitsToSeconds('1', '0', '0')).toBe(31536000); // 1 year
      expect(timeUnitsToSeconds('5', '0', '0')).toBe(157680000); // 5 years
      expect(timeUnitsToSeconds('0', '1', '0')).toBe(2592000); // 1 month (30 days)
      expect(timeUnitsToSeconds('0', '0', '1')).toBe(86400); // 1 day
      expect(timeUnitsToSeconds('1', '1', '1')).toBe(31536000 + 2592000 + 86400); // 1 year + 1 month + 1 day
    });
  });

  describe('round-trip conversions', () => {
    test('BPS to percentage and back', () => {
      const originalBps = 7000;
      const percentage = bpsToPercentage(originalBps);
      const backToBps = percentageToBps(percentage);
      expect(backToBps).toBe(originalBps);
    });

    test('seconds to time units and back (approximate)', () => {
      const originalSeconds = 31536000; // 1 year
      const timeUnits = secondsToTimeUnits(originalSeconds);
      const backToSeconds = timeUnitsToSeconds(timeUnits.years, timeUnits.months, timeUnits.days);
      expect(backToSeconds).toBe(originalSeconds);
    });
  });
});

// Manual test function that can be called in browser console
(window as any).testPackageFormConversions = () => {
  console.log('Testing PackageForm conversion functions...');
  
  // Test BPS conversions
  console.log('BPS Tests:');
  console.log('7000 BPS =', bpsToPercentage(7000), '%');
  console.log('70% =', percentageToBps('70'), 'BPS');
  
  // Test time conversions
  console.log('\nTime Tests:');
  console.log('31536000 seconds =', secondsToTimeUnits(31536000));
  console.log('1 year =', timeUnitsToSeconds('1', '0', '0'), 'seconds');
  
  console.log('\nAll tests completed!');
};
