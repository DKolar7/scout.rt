describe("scout.arrays", function() {

  describe("init", function() {

    it("checks whether array has correct length and initial values", function() {
      var i, arr = scout.arrays.init(5, 'foo');
      expect(arr.length).toBe(5);
      for (i=0; i<arr.length; i++) {
        expect(arr[i]).toBe('foo');
      }
    });

  });

  describe("replace", function() {

    it("replaces elements", function() {
      var arr = [ 'a', 'b', 'c', 'd' ];

      scout.arrays.replace(arr, 'c', 'x');
      expect(arr).toEqual(['a', 'b', 'x', 'd']);
      scout.arrays.replace(arr, 'e', 'y');
      expect(arr).toEqual(['a', 'b', 'x', 'd']);
    });

  });

  describe("equals", function() {

    it("checks whether two arrays contain the same elements in the same order", function() {
      var arr1 = ['a','b','c'];
      var arr2 = ['a','b','c'];
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();

      arr1 = ['a','b','c'];
      arr2 = ['b','a','b'];
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();

      arr1 = ['a','b','c'];
      arr2 = ['a','b'];
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();

      arr1 = ['a','b'];
      arr2 = ['a','b', 'c'];
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();

      arr1 = ['a'];
      arr2 = ['a'];
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();

      arr1 = ['a'];
      arr2 = ['b'];
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();
    });

    it("considers emtpy and same arrays", function() {
      var arr1 = [];
      var arr2 = ['b','a','b'];
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();

      arr1 = ['a'];
      arr2 = [];
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();

      arr1 = [];
      arr2 = [];
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();

      arr1 = ['a'];
      arr2 = arr1;
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();
    });

    it("returns true if one array is undefined/null and the other empty", function() {
      var arr1 = [];
      var arr2;
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();

      arr1 = ['a'];
      arr2 = undefined;
      expect(scout.arrays.equals(arr1,arr2)).toBeFalsy();

      arr1 = null;
      arr2 = [];
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();

      arr1 = null;
      arr2 = null;
      expect(scout.arrays.equals(arr1,arr2)).toBeTruthy();
    });

  });

  describe("equalsIgnoreOrder", function() {

    it("checks whether two arrays contain the same elements without considering the order", function() {
      var arr1 = ['a','b','c'];
      var arr2 = ['b','a','b'];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();

      arr1 = ['a','b','c'];
      arr2 = ['a','b'];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeFalsy();

      arr1 = ['a','b'];
      arr2 = ['a','b', 'c'];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeFalsy();

      arr1 = ['a'];
      arr2 = ['a'];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();

      arr1 = ['a'];
      arr2 = ['b'];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeFalsy();
    });

    it("considers emtpy and same arrays", function() {
      var arr1 = [];
      var arr2 = ['b','a','b'];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeFalsy();

      arr1 = ['a'];
      arr2 = [];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeFalsy();

      arr1 = [];
      arr2 = [];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();

      arr1 = ['a'];
      arr2 = arr1;
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();
    });

    it("returns true if one array is undefined/null and the other empty", function() {
      var arr1 = [];
      var arr2;
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();

      arr1 = ['a'];
      arr2 = undefined;
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeFalsy();

      arr1 = null;
      arr2 = [];
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();

      arr1 = null;
      arr2 = null;
      expect(scout.arrays.equalsIgnoreOrder(arr1,arr2)).toBeTruthy();
    });

  });


});
