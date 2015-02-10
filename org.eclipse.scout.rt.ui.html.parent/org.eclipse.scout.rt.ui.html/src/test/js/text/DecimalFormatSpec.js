/* global LocaleSpecHelper */
describe("DecimalFormat", function() {
  var locale;
  var helper;

  beforeEach(function() {
    setFixtures(sandbox());
    helper = new LocaleSpecHelper();
    locale = helper.createLocale('de_CH');
  });

  afterEach(function() {
    locale = null;
  });

  describe("format", function() {

    it("considers decimal separators", function() {
      var pattern = '###0.00';
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0.00');
      expect(decimalFormat.format(0.000)).toBe('0.00');
      expect(decimalFormat.format(1000.1234)).toBe('1000.12');
      expect(decimalFormat.format(1000.1234)).toBe('1000.12');
      expect(decimalFormat.format(56000.1234)).toBe('56000.12');

      // Without digits before decimal point
      pattern = '.00';
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('.00');
      expect(decimalFormat.format(0.000)).toBe('.00');
      expect(decimalFormat.format(1000.1234)).toBe('1000.12');
      expect(decimalFormat.format(12345.6789)).toBe('12345.68'); // rounding

      locale = helper.createLocale('de_DE');
      pattern = '###0.00';
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0,00');
      expect(decimalFormat.format(0.000)).toBe('0,00');
      expect(decimalFormat.format(1000.1234)).toBe('1000,12');
    });

    it("considers grouping separators", function() {
      var pattern = '#,##0.00';
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0.00');
      expect(decimalFormat.format(10)).toBe('10.00');
      expect(decimalFormat.format(100)).toBe('100.00');
      expect(decimalFormat.format(1000.1234)).toBe('1\'000.12');
      expect(decimalFormat.format(50121000.1234)).toBe('50\'121\'000.12');
      expect(decimalFormat.format(100005121000.1234)).toBe('100\'005\'121\'000.12');

      locale = helper.createLocale('de_DE');
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0,00');
      expect(decimalFormat.format(10)).toBe('10,00');
      expect(decimalFormat.format(100)).toBe('100,00');
      expect(decimalFormat.format(1000.1234)).toBe('1.000,12');
      expect(decimalFormat.format(50121000.1234)).toBe('50.121.000,12');
      expect(decimalFormat.format(100005121000.1234)).toBe('100.005.121.000,12');
    });

    it("can swap the position of the minus sign", function() {
      var pattern = '0.0-'; // Group separator after decimal separator, 0 after #
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0.0');
      expect(decimalFormat.format(10)).toBe('10.0');
      expect(decimalFormat.format(-14.234)).toBe('14.2-');
    });

    it("can handle invalid patterns", function() {
      var pattern = '#.##0,00'; // Group separator after decimal separator, 0 after #
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('.000');
      expect(decimalFormat.format(10)).toBe('10.000');
      expect(decimalFormat.format(50121000.1234)).toBe('50121000.1234');
      expect(decimalFormat.format(50121000.1234567)).toBe('50121000.12346');
    });

    it("distinguishes digits and zero digits", function() {
      var pattern = '##0.#';
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0');
      expect(decimalFormat.format(112)).toBe('112');

      pattern = '#.#';
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('');
      expect(decimalFormat.format(112)).toBe('112');

      pattern = '0000.0000';
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(1)).toBe('0001.0000');
      expect(decimalFormat.format(125112)).toBe('125112.0000');

      // patterns without separator:

      pattern = '#';
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('');
      expect(decimalFormat.format(112)).toBe('112');

      pattern = '0';
      decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0');
      expect(decimalFormat.format(112)).toBe('112');
    });

    it("can handle positive and negative subpattern", function() {
      var pattern = '###0.00;minus 00.0#';
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0.00');
      expect(decimalFormat.format(0.000)).toBe('0.00');
      expect(decimalFormat.format(1000.1234)).toBe('1000.12');
      expect(decimalFormat.format(12345.6789)).toBe('12345.68'); // rounding

      expect(decimalFormat.format(-1)).toBe('minus 1.00'); // negative pattern is only used for prefix/suffix
      expect(decimalFormat.format(-2.000)).toBe('minus 2.00');
      expect(decimalFormat.format(-1000.1234)).toBe('minus 1000.12');
      expect(decimalFormat.format(-12345.6789)).toBe('minus 12345.68');

      // Formats positive numbers as negative and negative numbers as positive
      pattern = '-0.00;0.00';
      decimalFormat = new scout.DecimalFormat(locale, pattern);
      expect(decimalFormat.format(12)).toBe('-12.00');
      expect(decimalFormat.format(-924.566)).toBe('924.57');

      // Normal mode, auto-insertion of minus sign
      pattern = '0.00';
      decimalFormat = new scout.DecimalFormat(locale, pattern);
      expect(decimalFormat.format(12)).toBe('12.00');
      expect(decimalFormat.format(-924.566)).toBe('-924.57');

      // Prefix and minus sign position in front
      pattern = '-X0.00';
      decimalFormat = new scout.DecimalFormat(locale, pattern);
      expect(decimalFormat.format(12)).toBe('X12.00');
      expect(decimalFormat.format(-924.566)).toBe('-X924.57');
      pattern = 'X-0.00';
      decimalFormat = new scout.DecimalFormat(locale, pattern);
      expect(decimalFormat.format(12)).toBe('X12.00');
      expect(decimalFormat.format(-924.566)).toBe('X-924.57');

      // Minus sign position at end
      pattern = '0.00-';
      decimalFormat = new scout.DecimalFormat(locale, pattern);
      expect(decimalFormat.format(12)).toBe('12.00');
      expect(decimalFormat.format(-924.566)).toBe('924.57-');
    });

    it("can handle exotic symbols", function() {
      var pattern = '#,##0.00';
      locale.decimalFormatSymbols.minusSign = 'M';
      locale.decimalFormatSymbols.decimalSeparator = '!!';
      locale.decimalFormatSymbols.groupingSeparator = '~';
      var decimalFormat = new scout.DecimalFormat(locale, pattern);

      expect(decimalFormat.format(0)).toBe('0!!00');
      expect(decimalFormat.format(0.000)).toBe('0!!00');
      expect(decimalFormat.format(1000.1234)).toBe('1~000!!12');
      expect(decimalFormat.format(12345.6789)).toBe('12~345!!68');
      expect(decimalFormat.format(1234500.6789)).toBe('1~234~500!!68');

      expect(decimalFormat.format(-1)).toBe('M1!!00');
    });

  });

});
