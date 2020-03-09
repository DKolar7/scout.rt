/*******************************************************************************
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
describe("HtmlComponent", function() {
  setFixtures(sandbox());
  var session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
  });

  var jqueryMock = {
    data: function(htmlComp) {}
  };

  var LayoutMock = function() {
    LayoutMock.parent.call(this);
  };
  scout.inherits(LayoutMock, scout.AbstractLayout);
  LayoutMock.prototype.layout = function() {};

  var StaticLayout = function() {
    StaticLayout.parent.call(this);
    this.prefSize = new scout.Dimension();
  };
  scout.inherits(StaticLayout, scout.AbstractLayout);

  StaticLayout.prototype.preferredLayoutSize = function($container, options) {
    return this.prefSize;
  };

  var addWidthHeightMock = function(jqueryMock) {
    jqueryMock.width = function(val) {
      if (val !== undefined) {
        return jqueryMock;
      }
    };
    jqueryMock.height = function(val) {
      if (val !== undefined) {
        return jqueryMock;
      }
    };
    jqueryMock.outerWidth = function(withMargins) {
      return 6;
    };
    jqueryMock.outerHeight = function(withMargins) {
      return 7;
    };
    jqueryMock[0] = {};
    jqueryMock[0].getBoundingClientRect = function() {
      return {
        width: 6,
        height: 7
      };
    };
    jqueryMock.isDisplayNone = function() {
      return false;
    };
  };

  describe("install", function() {

    it("does NOT set data 'htmlComponent' when constructor is called", function() {
      spyOn(jqueryMock, 'data');
      var htmlComp = new scout.HtmlComponent(jqueryMock, session);
      expect(jqueryMock.data).not.toHaveBeenCalled();
    });

    it("sets data 'htmlComponent' when install() is called", function() {
      spyOn(jqueryMock, 'data');
      var htmlComp = scout.HtmlComponent.install(jqueryMock, session);
      expect(jqueryMock.data).toHaveBeenCalledWith('htmlComponent', htmlComp);
    });

  });

  describe("size", function() {

    addWidthHeightMock(jqueryMock);

    it("returns getBoundingClientRect() of JQuery comp", function() {
      var htmlComp = scout.HtmlComponent.install(jqueryMock, session);
      var size = htmlComp.size();
      expect(size.width).toBe(6);
      expect(size.height).toBe(7);
    });
  });

  describe("setSize", function() {
    var $comp;
    var htmlComp;

    // return size(6, 7)
    addWidthHeightMock(jqueryMock);

    beforeEach(function() {
      $comp = $('<div>').appendTo(session.$entryPoint);
      htmlComp = scout.HtmlComponent.install($comp, session);
      htmlComp.layout = new LayoutMock();
    });

    it("accepts scout.Dimension as single argument", function() {
      spyOn($comp, 'css').and.callThrough();
      htmlComp.setSize(new scout.Dimension(6, 7));
      var size = htmlComp.size();
      expect(size.width).toBe(6);
      expect(size.height).toBe(7);
      expect($comp.css).toHaveBeenCalledWith('width', '6px');
      expect($comp.css).toHaveBeenCalledWith('height', '7px');
    });

    it("calls invalidate on layout when size has changed", function() {
      spyOn(htmlComp.layout, 'invalidate');
      htmlComp.setSize(new scout.Dimension(1, 2));
      expect(htmlComp.layout.invalidate).toHaveBeenCalled();
    });

  });

  describe("insets", function() {

    it("reads padding, margin and border correctly", function() {
      var jqueryObj = $('<div>').css({
        marginTop: '1px',
        marginRight: '2px',
        marginBottom: '3px',
        marginLeft: '4px',
        paddingTop: '5px',
        paddingRight: '6px',
        paddingBottom: '7px',
        paddingLeft: '8px',
        borderStyle: 'solid',
        borderTopWidth: '9px',
        borderRightWidth: '10px',
        borderBottomWidth: '11px',
        borderLeftWidth: '12px'
      });
      var htmlComp = scout.HtmlComponent.install(jqueryObj, session);
      var expected = new scout.Insets(15, 18, 21, 24);
      var actual = htmlComp.insets({
        includeMargin: true
      });
      expect(actual).toEqual(expected);
      var actual2 = htmlComp.insets(true);
      expect(actual2).toEqual(expected);
    });

  });

  describe("validateLayout", function() {
    var $comp;
    var $child;
    var htmlComp;
    var htmlChild;

    beforeEach(function() {
      $comp = $('<div>').appendTo(session.$entryPoint);
      $child = $comp.appendDiv();
      htmlComp = scout.HtmlComponent.install($comp, session);
      htmlChild = scout.HtmlComponent.install($child, session);
    });

    it("calls htmlComp.layout", function() {
      spyOn(htmlComp.layout, 'layout').and.callThrough();
      htmlComp.validateLayout();
      expect(htmlComp.layout.layout).toHaveBeenCalled();
    });

    it("calls layout of the child component", function() {
      spyOn(htmlChild.layout, 'layout').and.callThrough();
      htmlComp.validateLayout();
      expect(htmlChild.layout.layout).toHaveBeenCalled();
    });

    it("does not layout invisible components", function() {
      $comp.setVisible(false);
      spyOn(htmlComp.layout, 'layout').and.callThrough();
      htmlComp.validateLayout();
      expect(htmlComp.layout.layout).not.toHaveBeenCalled();
    });

    it("does not layout components with an invisible parent", function() {
      $comp.setVisible(false);
      spyOn(htmlChild.layout, 'layout').and.callThrough();
      htmlComp.validateLayout();
      expect(htmlChild.layout.layout).not.toHaveBeenCalled();
    });

    it('does not call parents() too many times', function() {
      spyOn(htmlComp.$comp, 'parents').and.callThrough();
      spyOn(htmlChild.$comp, 'parents').and.callThrough();
      htmlComp.validateLayout();
      expect(htmlComp.$comp.parents).toHaveBeenCalled();
      expect(htmlChild.$comp.parents).not.toHaveBeenCalled();
    });

    it('does not layout components with an animating parent', function() {
      $comp.addClass('animate-test');
      spyOn(htmlChild.layout, 'layout').and.callThrough();
      htmlChild.validateLayout();
      expect(htmlChild.layout.layout).not.toHaveBeenCalled();

      // Simulate end of animation
      $comp.removeClass('animate-test');
      $comp.trigger('animationend');
      expect(htmlChild.layout.layout).toHaveBeenCalled();
    });

    it('does not layout animated components', function() {
      var calledPostValidateFunction = false;
      session.layoutValidator.schedulePostValidateFunction(function() {
        calledPostValidateFunction = true;
      });

      $comp.addClass('animate-test');
      spyOn(htmlComp.layout, 'layout').and.callThrough();
      htmlComp.validateLayout();
      expect(htmlComp.layout.layout).not.toHaveBeenCalled();
      expect(calledPostValidateFunction).toBe(false);

      // Simulate end of animation
      $comp.removeClass('animate-test');
      $comp.trigger('animationend');
      expect(htmlComp.layout.layout).toHaveBeenCalled();
      expect(calledPostValidateFunction).toBe(true);
    });

  });

  describe("prefSize", function() {
    var $comp;
    var htmlComp;

    beforeEach(function() {
      $comp = $('<div>').appendTo(session.$entryPoint);
      $comp.css({
        minWidth: '10px',
        maxWidth: '20px',
        minHeight: '5px',
        maxHeight: '30px'
      });
      htmlComp = scout.HtmlComponent.install($comp, session);
      htmlComp.setLayout(new StaticLayout());
    });

    it("returns preferred size of the component", function() {
      htmlComp.layout.prefSize = new scout.Dimension(15, 13);
      var size = htmlComp.prefSize();
      expect(size.width).toBe(15);
      expect(size.height).toBe(13);
    });

    it("considers max width/height set by CSS", function() {
      htmlComp.layout.prefSize = new scout.Dimension(500, 500);
      var size = htmlComp.prefSize();
      expect(size.width).toBe(20);
      expect(size.height).toBe(30);
    });

    it("considers min width/height set by CSS", function() {
      htmlComp.layout.prefSize = new scout.Dimension(2, 3);
      var size = htmlComp.prefSize();
      expect(size.width).toBe(10);
      expect(size.height).toBe(5);
    });

    it("returns zero size for invisible components", function() {
      htmlComp.validateLayout();
      spyOn(htmlComp.layout, 'preferredLayoutSize').and.callThrough();

      htmlComp.layout.prefSize = new scout.Dimension(15, 13);
      var size = htmlComp.prefSize();
      expect(size.width).toBe(15);
      expect(size.height).toBe(13);
      expect(htmlComp.layout.preferredLayoutSize.calls.count()).toEqual(1);

      $comp.setVisible(false);
      size = htmlComp.prefSize();
      expect(size.width).toBe(0);
      expect(size.height).toBe(0);
      expect(htmlComp.layout.preferredLayoutSize.calls.count()).toEqual(1); // should return (0,0) directly

      $comp.setVisible(true);
      size = htmlComp.prefSize();
      expect(size.width).toBe(15);
      expect(size.height).toBe(13);
      expect(htmlComp.layout.preferredLayoutSize.calls.count()).toEqual(1); // should return previously cached size
    });
  });

});
