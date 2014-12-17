/* global FormSpecHelper */
describe("TabBox", function() {
  var session;
  var helper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = new scout.Session($('#sandbox'), '1.1');
    helper = new FormSpecHelper(session);
  });

  function createField(model) {
    var field = new scout.TabBox();
    field.init(model, session);
    return field;
  }

  function createModel(tabItems) {
    var model = helper.createFieldModel();
    model.tabItems = tabItems;
    model.selectedTab = 0;
    return model;
  }

  describe("render", function() {
//    var field;

    //FIXME CGU requires possibility to build adapterDataCache
//    beforeEach(function() {
//      var groupBox = helper.createModel();
//      field = createField(createModel([groupBox.id]));
//    });


//    it("does NOT call layout for the selected tab on initialization", function() {
//      var validatorSpy = spyOn(session.layoutValidator, 'revalidate').and.callThrough();
//      field.render(session.$entryPoint);
//      expect(validatorSpy.revalidate).not.toHaveBeenCalled();
//    });

  });

});
