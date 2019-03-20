/*******************************************************************************
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
describe('Widget', function() {

  var session, widget, parent;

  var TestWidget = function() {
    TestWidget.parent.call(this);
  };
  scout.inherits(TestWidget, scout.NullWidget);
  TestWidget.prototype._render = function() {
    this.$container = this.$parent.appendDiv();
    this.$container.setTabbable(true);
    this.htmlComp = scout.HtmlComponent.install(this.$container, this.session);
    this.htmlComp.getParent = function() {
      return null; // Detach from parent because our parent does not layout children
    };
  };

  var ScrollableWidget = function() {
    ScrollableWidget.parent.call(this);
  };
  scout.inherits(ScrollableWidget, scout.NullWidget);
  ScrollableWidget.prototype._render = function() {
    this.$container = this.$parent.appendDiv();
    this.htmlComp = scout.HtmlComponent.install(this.$container, this.session);
    this.htmlComp.getParent = function() {
      return null; // Detach from parent because our parent does not layout children
    };
    this.$container.css({
      position: 'absolute',
      minHeight: 50,
      minWidth: 50
    });
    this.$elem = this.$container.appendDiv();
    this.$elem.css({
      display: 'inline-block',
      position: 'absolute',
      minHeight: 100,
      minWidth: 100
    });
    this._installScrollbars({
      axis: 'both'
    });
  };

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();

    widget = new TestWidget();
    parent = new TestWidget();
  });

  function createWidget(model) {
    var defaults = {
      parent: parent,
      session: session
    };
    model = $.extend({}, defaults, model);
    var widget = new TestWidget();
    widget.init(model);
    return widget;
  }

  describe('visitChildren', function() {
    var child1, child2, grandChild1, grandChild2, grandChild2_1;

    function createVisitStructure(){
      child1 = new TestWidget();
      child1.init({
        id: 'child1',
        session: session,
        parent: parent,
        wasVisited: false
      });
      child2 = new TestWidget();
      child2.init({
        id: 'child2',
        session: session,
        parent: parent,
        wasVisited: false
      });
      grandChild1 = new TestWidget();
      grandChild1.init({
        id: 'grandChild1',
        session: session,
        parent: child1,
        wasVisited: false
      });
      grandChild2 = new TestWidget();
      grandChild2.init({
        id: 'grandChild2',
        session: session,
        parent: child1,
        wasVisited: false
      });
      grandChild2_1 = new TestWidget();
      grandChild2_1.init({
        session: session,
        parent: child2,
        wasVisited: false
      });
    }

    it('visits all descendants', function() {
      widget.init({
        session: session,
        parent: parent
      });
      var counter = 0;
      parent.visitChildren(function(item) {
        counter++;
      });
      expect(counter).toBe(1); /* parent itself is not visited, only children */
    });

    it('can be aborted when returning true', function() {
      createVisitStructure();

      // Abort at grandChild1 -> don't visit siblings of grandChild1 and siblings of parent
      parent.visitChildren(function(child) {
        child.wasVisited = true;
        return child === grandChild1;
      });
      expect(child1.wasVisited).toBe(true);
      expect(child2.wasVisited).toBe(false);
      expect(grandChild1.wasVisited).toBe(true);
      expect(grandChild2.wasVisited).toBe(false);
      expect(grandChild2_1.wasVisited).toBe(false);

      // Reset wasVisited flag
      parent.visitChildren(function(child) {
        child.wasVisited = false;
        return false;
      });
      expect(child1.wasVisited).toBe(false);
      expect(child2.wasVisited).toBe(false);
      expect(grandChild1.wasVisited).toBe(false);
      expect(grandChild2.wasVisited).toBe(false);
      expect(grandChild2_1.wasVisited).toBe(false);

      // Abort at child2 -> don't visit children of child2
      parent.visitChildren(function(child) {
        child.wasVisited = true;
        return child === child2;
      });
      expect(child1.wasVisited).toBe(true);
      expect(child2.wasVisited).toBe(true);
      expect(grandChild1.wasVisited).toBe(true);
      expect(grandChild2.wasVisited).toBe(true);
      expect(grandChild2_1.wasVisited).toBe(false);
    });

    it('can be aborted when returning scout.TreeVisitResult.TERMINATE', function() {
      createVisitStructure();

      // Abort at grandChild1 -> don't visit siblings of grandChild1 and siblings of parent
      parent.visitChildren(function(child) {
        child.wasVisited = true;
        if (child === grandChild1) {
          return scout.TreeVisitResult.TERMINATE;
        }
      });
      expect(child1.wasVisited).toBe(true);
      expect(child2.wasVisited).toBe(false);
      expect(grandChild1.wasVisited).toBe(true);
      expect(grandChild2.wasVisited).toBe(false);
      expect(grandChild2_1.wasVisited).toBe(false);

      // Reset wasVisited flag
      parent.visitChildren(function(child) {
        child.wasVisited = false;
        return false;
      });
      expect(child1.wasVisited).toBe(false);
      expect(child2.wasVisited).toBe(false);
      expect(grandChild1.wasVisited).toBe(false);
      expect(grandChild2.wasVisited).toBe(false);
      expect(grandChild2_1.wasVisited).toBe(false);

      // Abort at child2 -> don't visit children of child2
      parent.visitChildren(function(child) {
        child.wasVisited = true;
        if (child === child2) {
          return scout.TreeVisitResult.TERMINATE;
        }
      });
      expect(child1.wasVisited).toBe(true);
      expect(child2.wasVisited).toBe(true);
      expect(grandChild1.wasVisited).toBe(true);
      expect(grandChild2.wasVisited).toBe(true);
      expect(grandChild2_1.wasVisited).toBe(false);
    });

    it('can skip a subtree when returning scout.TreeVisitResult.SKIP_SUBTREE', function() {
      createVisitStructure();

      // Abort at grandChild1 -> don't visit siblings of grandChild1 and siblings of parent
      parent.visitChildren(function(child) {
        child.wasVisited = true;
        if (child === child1) {
          return scout.TreeVisitResult.SKIP_SUBTREE;
        }
      });
      expect(child1.wasVisited).toBe(true);
      expect(child2.wasVisited).toBe(true);
      expect(grandChild1.wasVisited).toBe(false);
      expect(grandChild2.wasVisited).toBe(false);
      expect(grandChild2_1.wasVisited).toBe(true);

      // Reset wasVisited flag
      parent.visitChildren(function(child) {
        child.wasVisited = false;
        return false;
      });
      expect(child1.wasVisited).toBe(false);
      expect(child2.wasVisited).toBe(false);
      expect(grandChild1.wasVisited).toBe(false);
      expect(grandChild2.wasVisited).toBe(false);
      expect(grandChild2_1.wasVisited).toBe(false);

      // Abort at child2 -> don't visit children of child2
      parent.visitChildren(function(child) {
        child.wasVisited = true;
        if (child === child2) {
          return scout.TreeVisitResult.SKIP_SUBTREE;
        }
      });
      expect(child1.wasVisited).toBe(true);
      expect(child2.wasVisited).toBe(true);
      expect(grandChild1.wasVisited).toBe(true);
      expect(grandChild2.wasVisited).toBe(true);
      expect(grandChild2_1.wasVisited).toBe(false);
    });
  });

  describe('widget', function() {
    it('finds a child with the given widget id', function() {
      var child1 = new TestWidget();
      child1.init({
        id: 'child1',
        session: session,
        parent: parent
      });
      var child2 = new TestWidget();
      child2.init({
        id: 'child2',
        session: session,
        parent: parent
      });
      var grandChild1 = new TestWidget();
      grandChild1.init({
        id: 'grandChild1',
        session: session,
        parent: child1
      });
      var grandChild2 = new TestWidget();
      grandChild2.init({
        id: 'grandChild2',
        session: session,
        parent: child1
      });
      expect(parent.widget('child1')).toBe(child1);
      expect(parent.widget('child2')).toBe(child2);
      expect(parent.widget('grandChild1')).toBe(grandChild1);
      expect(parent.widget('grandChild2')).toBe(grandChild2);
    });

    it('does not visit other children if the child has been found', function() {
      var child1 = new TestWidget();
      child1.init({
        id: 'child1',
        session: session,
        parent: parent
      });
      var child2 = new TestWidget();
      child2.init({
        id: 'child2',
        session: session,
        parent: parent
      });
      var grandChild1 = new TestWidget();
      grandChild1.init({
        id: 'grandChild1',
        session: session,
        parent: child1
      });
      var grandChild2 = new TestWidget();
      grandChild2.init({
        id: 'grandChild2',
        session: session,
        parent: child1
      });
      spyOn(parent, 'visitChildren').and.callThrough();
      expect(parent.visitChildren.calls.count()).toBe(0);

      expect(parent.widget('child1')).toBe(child1);
      expect(parent.visitChildren.calls.count()).toBe(1); // Only called once
    });
  });

  describe('enabled', function() {
    it('should be propagated correctly', function() {
      widget.init({
        session: session,
        parent: parent
      });
      // check setup
      expect(widget.inheritAccessibility).toBe(true);
      expect(widget.parent.inheritAccessibility).toBe(true);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(true);
      expect(widget.parent.enabled).toBe(true);
      expect(widget.parent.enabledComputed).toBe(true);

      // check change on widget itself
      widget.setEnabled(false, false, false);
      expect(widget.enabled).toBe(false);
      expect(widget.enabledComputed).toBe(false);
      expect(widget.parent.enabled).toBe(true);
      expect(widget.parent.enabledComputed).toBe(true);

      // check that child-propagation works and resets the enabled state
      widget.parent.setEnabled(true, false, true);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(true);
      expect(widget.parent.enabled).toBe(true);
      expect(widget.parent.enabledComputed).toBe(true);

      // check that inheritance works
      widget.parent.setEnabled(false, false, false);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(false);
      expect(widget.parent.enabled).toBe(false);
      expect(widget.parent.enabledComputed).toBe(false);

      // check that parent-propagation works
      widget.setEnabled(true, true, false);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(true);
      expect(widget.parent.enabled).toBe(true);
      expect(widget.parent.enabledComputed).toBe(true);
    });

    it('should not be inherited if inheritAccessibility is disabled', function() {
      widget.init({
        session: session,
        parent: parent
      });
      // check setup
      widget.setInheritAccessibility(false);
      expect(widget.inheritAccessibility).toBe(false);
      expect(widget.parent.inheritAccessibility).toBe(true);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(true);
      expect(widget.parent.enabled).toBe(true);
      expect(widget.parent.enabledComputed).toBe(true);

      // change enabled of parent and verify that it has no effect on child because inheritance is disabled.
      widget.parent.setEnabled(false, false, false);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(true);
      expect(widget.parent.enabled).toBe(false);
      expect(widget.parent.enabledComputed).toBe(false);
    });

    it('should correctly recalculate enabled state when adding a new field', function() {
      widget.init({
        session: session,
        parent: parent
      });
      // check setup
      parent.setEnabled(false, false, false);
      expect(widget.enabled).toBe(true);
      expect(widget.enabledComputed).toBe(false);
      expect(widget.parent.enabled).toBe(false);
      expect(widget.parent.enabledComputed).toBe(false);

      // add a new field which itself is enabled
      var tmpParent = new TestWidget();
      var additionalWidget = new TestWidget();
      additionalWidget.init({
        session: session,
        parent: tmpParent
      });

      expect(additionalWidget.enabled).toBe(true);
      expect(additionalWidget.enabledComputed).toBe(true);
      additionalWidget.setParent(widget.parent);

      // check that the new widget is disabled now
      expect(additionalWidget.enabled).toBe(true);
      expect(additionalWidget.enabledComputed).toBe(false);
    });
  });

  describe('rendering', function() {

    it('should set rendering, rendered flags correctly', function() {
      widget.init({
        session: session,
        parent: parent
      });
      expect(widget.rendered).toBe(false);
      expect(widget.rendering).toBe(false);
      widget.render(session.$entryPoint);
      expect(widget.rendered).toBe(true);
      expect(widget.rendering).toBe(false);
    });

    it('should set rendering flag to true _while_ the component is rendering', function() {
      var rendering;
      widget._render = function() {
        rendering = this.rendering;
      };
      widget.init({
        session: session,
        parent: parent
      });
      widget.render(session.$entryPoint);
      expect(rendering).toBe(true);
    });

  });

  describe('clone', function() {
    var model, widget, expectedProperties = ['id', 'session', 'objectType', 'parent', 'text'];

    beforeEach(function() {
      model = createSimpleModel('Menu', session);
      model.label = 'bar';
      widget = scout.create(model);
      widget.$container = 'dummy container property';
    });

    it('clones only properties marked as clone property', function() {
      var widgetClone = widget.clone({
        parent: widget.parent
      });
      // should contain the following properties:
      expectedProperties.forEach(function(propertyName) {
        expect(widgetClone[propertyName]).not.toBe(undefined);
      });
      // but not the $container property (which has been added later)
      expect(widgetClone.$container).toBe(undefined);
    });

    it('\'text\' must be recognized as clone property, but not \'$container\'', function() {
      expect(widget.isCloneProperty('text')).toBe(true);
      expect(widget.isCloneProperty('$container')).toBe(false);
    });

    it('prefers properties passed as modelOverride', function() {
      var widgetClone = widget.clone({
        parent: widget.parent,
        text: 'foo'
      });
      expect(widgetClone.text).toBe('foo');
    });

  });

  describe('init', function() {

    it('links widget properties with the widget', function() {
      var child = createWidget({
        parent: parent
      });
      var widget = createWidget({
        parent: parent,
        childWidget: child
      });

      expect(child.parent).toBe(widget);
      expect(child.owner).toBe(parent);
    });

  });

  describe('destroy', function() {
    it('destroys the widget', function() {
      var widget = createWidget({
        parent: parent
      });
      expect(widget.destroyed).toBe(false);

      widget.destroy();
      expect(widget.destroyed).toBe(true);
    });

    it('destroys the children', function() {
      var widget = createWidget({
        parent: parent
      });
      var child0 = createWidget({
        parent: widget
      });
      var child1 = createWidget({
        parent: widget
      });
      expect(widget.destroyed).toBe(false);
      expect(child0.destroyed).toBe(false);
      expect(child1.destroyed).toBe(false);

      widget.destroy();
      expect(widget.destroyed).toBe(true);
      expect(child0.destroyed).toBe(true);
      expect(child1.destroyed).toBe(true);
    });

    it('does only destroy children if the parent is the owner', function() {
      var widget = createWidget({
        parent: parent
      });
      var another = createWidget({
        parent: parent
      });
      var child0 = createWidget({
        parent: widget,
        owner: another
      });
      var child1 = createWidget({
        parent: widget
      });
      expect(widget.destroyed).toBe(false);
      expect(another.destroyed).toBe(false);
      expect(child0.destroyed).toBe(false);
      expect(child1.destroyed).toBe(false);

      widget.destroy();
      expect(widget.destroyed).toBe(true);
      expect(another.destroyed).toBe(false);
      expect(child0.destroyed).toBe(false);
      expect(child1.destroyed).toBe(true);

      another.destroy();
      expect(another.destroyed).toBe(true);
      expect(child0.destroyed).toBe(true);
    });

    it('removes the link to parent and owner', function() {
      var widget = createWidget({
        parent: parent
      });
      expect(widget.parent).toBe(parent);
      expect(widget.owner).toBe(parent);
      expect(parent.children[0]).toBe(widget);

      widget.destroy();
      expect(widget.parent).toBe(null);
      expect(widget.owner).toBe(null);
      expect(parent.children.length).toBe(0);
    });
  });

  describe('setParent', function() {
    it('links the widget with the new parent', function() {
      var widget = createWidget({
        parent: parent
      });
      var another = createWidget({
        parent: parent
      });
      expect(widget.parent).toBe(parent);
      expect(another.parent).toBe(parent);

      another.setParent(widget);
      expect(widget.parent).toBe(parent);
      expect(another.parent).toBe(widget);
    });

    it('removes the widget from the old parent if the old is not the owner', function() {
      var widget = createWidget({
        parent: parent
      });
      var owner = createWidget({
        parent: new TestWidget()
      });
      var another = createWidget({
        parent: parent,
        owner: owner
      });
      expect(parent.children[0]).toBe(widget);
      expect(parent.children[1]).toBe(another);
      expect(widget.children.length).toBe(0);

      another.setParent(widget);
      expect(parent.children[0]).toBe(widget);
      expect(parent.children.length).toBe(1);
      expect(widget.children.length).toBe(1);
      expect(widget.children[0]).toBe(another);
    });

    it('does not remove the widget from the old parent if the old is the owner', function() {
      var widget = createWidget({
        parent: parent
      });
      var another = createWidget({
        parent: parent
      });
      expect(another.owner).toBe(parent);
      expect(parent.children[0]).toBe(widget);
      expect(parent.children[1]).toBe(another);
      expect(widget.children.length).toBe(0);

      // The reference to the owner must always be maintained so that the widget will be destroyed eventually
      another.setParent(widget);
      expect(parent.children[0]).toBe(widget);
      expect(parent.children[1]).toBe(another);
      expect(parent.children.length).toBe(2);
      expect(widget.children.length).toBe(1);
      expect(widget.children[0]).toBe(another);
    });

    it('relinks parent destroy listener to the new parent', function() {
      var widget = createWidget({
        parent: parent
      });
      var another = createWidget({
        parent: parent
      });
      expect(widget.parent).toBe(parent);
      expect(another.parent).toBe(parent);

      var widgetListenerCount = widget.events._eventListeners.length;
      var parentListenerCount = parent.events._eventListeners.length;
      another.setParent(widget);
      expect(parent.events._eventListeners.length).toBe(parentListenerCount - 1);
      expect(widget.events._eventListeners.length).toBe(widgetListenerCount + 1);

      another.setParent(parent);
      expect(parent.events._eventListeners.length).toBe(parentListenerCount);
      expect(widget.events._eventListeners.length).toBe(widgetListenerCount);

      // Ensure parent destroy listener is removed on destroy
      another.destroy();
      expect(parent.events._eventListeners.length).toBe(parentListenerCount - 1);
    });
  });

  describe('remove', function() {
    it('removes the widget', function() {
      var widget = createWidget({
        parent: parent
      });
      widget.render(session.$entryPoint);
      expect(widget.rendered).toBe(true);
      expect(widget.$container).toBeDefined();

      widget.remove();
      expect(widget.rendered).toBe(false);
      expect(widget.$container).toBe(null);
    });

    it('removes the children', function() {
      var widget = createWidget({
        parent: parent
      });
      var child0 = createWidget({
        parent: widget
      });
      var child0_0 = createWidget({
        parent: child0
      });
      widget.render(session.$entryPoint);
      child0.render(widget.$container);
      child0_0.render(child0.$container);
      expect(widget.rendered).toBe(true);
      expect(child0.rendered).toBe(true);
      expect(child0_0.rendered).toBe(true);

      widget.remove();
      expect(widget.rendered).toBe(false);
      expect(child0.rendered).toBe(false);
      expect(child0_0.rendered).toBe(false);
    });

    it('does not remove the children if owner is removed but parent is still rendered', function() {
      var widget = createWidget({
        parent: parent
      });
      var child0 = createWidget({
        parent: widget
      });
      var owner = createWidget({
        parent: new TestWidget()
      });
      var anotherChild = createWidget({
        parent: widget,
        owner: owner
      });
      widget.render(session.$entryPoint);
      owner.render(session.$entryPoint);
      child0.render(widget.$container);
      anotherChild.render(widget.$container);
      expect(anotherChild.parent).toBe(widget);
      expect(anotherChild.owner).toBe(owner);

      owner.remove();
      expect(owner.rendered).toBe(false);
      expect(anotherChild.rendered).toBe(true);
      expect(widget.rendered).toBe(true);
      expect(child0.rendered).toBe(true);

      // If the owner is destroyed, the widget has to be removed even if another widget is currently the parent
      // Otherwise the widget would be in a inconsistent state (destroyed, but still rendered)
      owner.destroy();
      expect(owner.rendered).toBe(false);
      expect(owner.destroyed).toBe(true);
      expect(anotherChild.rendered).toBe(false);
      expect(anotherChild.destroyed).toBe(true);
      expect(widget.rendered).toBe(true);
      expect(child0.rendered).toBe(true);
    });

    it('removes the widget if removing is animated but parent is removed while animation is running', function() {
      var removeOrder = [];
      var parentWidget = createWidget({
        parent: parent
      });
      var origRemove = parentWidget._remove;
      parentWidget._remove = function() {
        origRemove.call(this);
        removeOrder.push('parent');
      };
      var widget = createWidget({
        parent: parentWidget,
        animateRemoval: true
      });
      origRemove = widget._remove;
      widget._remove = function() {
        origRemove.call(this);
        removeOrder.push('child');
      };
      parentWidget.render(session.$entryPoint);
      widget.render();
      expect(widget.rendered).toBe(true);
      expect(widget.$container).toBeDefined();

      widget.remove();
      expect(widget.rendered).toBe(true);
      expect(widget.$container).toBeDefined();
      expect(widget.removalPending).toBe(true);

      // Even though animation has not run the widget needs to be removed because parent is removed
      parentWidget.remove();
      expect(parentWidget.rendered).toBe(false);
      expect(widget.rendered).toBe(false);
      expect(widget.$container).toBe(null);
      expect(widget.removalPending).toBe(false);

      // Expect that child is removed before parent
      expect(removeOrder).toEqual(['child', 'parent']);
    });
  });

  describe('setProperty', function() {

    it('triggers a property change event if the value changes', function() {
      var propertyChangeEvent;
      var widget = createWidget();
      widget.on('propertyChange', function(event) {
        propertyChangeEvent = event;
      });
      widget.setProperty('selected', true);
      expect(propertyChangeEvent.type).toBe('propertyChange');
      expect(propertyChangeEvent.propertyName).toBe('selected');
      expect(propertyChangeEvent.oldValue).toBe(undefined);
      expect(propertyChangeEvent.newValue).toBe(true);

      widget.setProperty('selected', false);
      expect(propertyChangeEvent.type).toBe('propertyChange');
      expect(propertyChangeEvent.propertyName).toBe('selected');
      expect(propertyChangeEvent.oldValue).toBe(true);
      expect(propertyChangeEvent.newValue).toBe(false);
    });

    it('does not trigger a property change event if the value does not change', function() {
      var propertyChangeEvent;
      var widget = createWidget();
      widget.on('propertyChange', function(event) {
        propertyChangeEvent = event;
      });
      widget.selected = true;
      widget.setProperty('selected', true);
      expect(propertyChangeEvent).toBe(undefined);
    });

    describe('with widget property', function() {
      it('links the widget with the new child widget', function() {
        var widget = createWidget({
          parent: parent
        });
        var another = createWidget({
          parent: parent
        });
        var child = createWidget({
          parent: parent
        });

        widget.setChildWidget(child);
        expect(child.parent).toBe(widget);
        expect(child.owner).toBe(parent);

        another.setChildWidget(child);
        expect(child.parent).toBe(another);
        expect(child.owner).toBe(parent);
      });

      it('links the widget with the new child widgets if it is an array', function() {
        var widget = createWidget({
          parent: parent
        });
        var another = createWidget({
          parent: parent
        });
        var children = [
          createWidget({
            parent: parent
          }),
          createWidget({
            parent: parent
          })
        ];

        widget.setChildWidget(children);
        expect(children[0].parent).toBe(widget);
        expect(children[0].owner).toBe(parent);
        expect(children[1].parent).toBe(widget);
        expect(children[1].owner).toBe(parent);

        another.setChildWidget(children);
        expect(children[0].parent).toBe(another);
        expect(children[0].owner).toBe(parent);
        expect(children[1].parent).toBe(another);
        expect(children[1].owner).toBe(parent);
      });

      it('does not fail if new widget is null', function() {
        var widget = createWidget({
          parent: parent
        });
        var another = createWidget({
          parent: parent
        });
        var child = createWidget({
          parent: parent
        });

        widget.setChildWidget(child);
        widget.setChildWidget(null);
        expect().nothing();
      });
    });

    it('calls the _render* method if there is one for this property', function() {
      var widget = createWidget({
        parent: parent
      });
      widget.render(session.$entryPoint);

      // Must not fail, render is optional
      widget.setProperty('foo', 'xyz');

      // Add render method and set property again
      widget._renderFoo = function() {
        this.$container.text(this.foo);
      };
      widget.setProperty('foo', 'bar');
      expect(widget.$container.text()).toBe('bar');
    });

  });

  describe("property css class", function() {

    it("adds or removes custom css class", function() {
      var widget = createWidget({
        parent: parent
      });
      widget.render(session.$entryPoint);

      widget.setCssClass('custom-class');
      expect(widget.$container).toHaveClass('custom-class');

      widget.setCssClass('');
      expect(widget.$container).not.toHaveClass('custom-class');
    });

    it("does not accidentally remove other css classes on a property change", function() {
      var widget = createWidget({
        parent: parent
      });
      widget.render(session.$entryPoint);
      widget.$container.addClass('xy');
      expect(widget.$container).toHaveClass('xy');

      widget.setCssClass('custom-class');
      expect(widget.$container).toHaveClass('custom-class');
      expect(widget.$container).toHaveClass('xy');

      widget.setCssClass('');
      expect(widget.$container).not.toHaveClass('custom-class');
      expect(widget.$container).toHaveClass('xy');
    });

    describe("addCssClass", function() {

      it("adds the cssClass to the existing classes", function() {
        var widget = createWidget({
          parent: parent
        });
        widget.render(session.$entryPoint);
        widget.addCssClass('custom-class');
        expect(widget.$container).toHaveClass('custom-class');

        widget.addCssClass('another-class1 another-class2');
        expect(widget.cssClass).toBe('custom-class another-class1 another-class2');
        expect(widget.$container).toHaveClass('custom-class');
        expect(widget.$container).toHaveClass('another-class1');
        expect(widget.$container).toHaveClass('another-class2');
      });

      it("does not add the same class multiple times", function() {
        var widget = createWidget({
          parent: parent
        });
        widget.render(session.$entryPoint);
        widget.addCssClass('custom-class');
        expect(widget.cssClass).toBe('custom-class');

        widget.addCssClass('custom-class');
        expect(widget.cssClass).toBe('custom-class');

        widget.addCssClass('custom-class custom-class');
        expect(widget.cssClass).toBe('custom-class');
      });

    });

    describe("removeCssClass", function() {

      it("removes the cssClass from the existing classes", function() {
        var widget = createWidget({
          parent: parent
        });
        widget.render(session.$entryPoint);
        widget.setCssClass('cls1 cls2 cls3');
        expect(widget.$container).toHaveClass('cls1');
        expect(widget.$container).toHaveClass('cls2');
        expect(widget.$container).toHaveClass('cls3');

        widget.removeCssClass('cls2');
        expect(widget.cssClass).toBe('cls1 cls3');
        expect(widget.$container).toHaveClass('cls1');
        expect(widget.$container).not.toHaveClass('cls2');
        expect(widget.$container).toHaveClass('cls3');

        widget.removeCssClass('cls1 cls3');
        expect(widget.cssClass).toBe('');
      });

    });

    describe("toggleCssClass", function() {

      it("toggles the cssClass based on a predicate", function() {
        var widget = createWidget({
          parent: parent
        });
        widget.render(session.$entryPoint);
        widget.setCssClass('cls1 cls2 cls3');
        expect(widget.$container).toHaveClass('cls1');
        expect(widget.$container).toHaveClass('cls2');
        expect(widget.$container).toHaveClass('cls3');

        widget.toggleCssClass('cls2', false);
        expect(widget.cssClass).toBe('cls1 cls3');
        expect(widget.$container).toHaveClass('cls1');
        expect(widget.$container).not.toHaveClass('cls2');
        expect(widget.$container).toHaveClass('cls3');

        widget.toggleCssClass('cls2', true);
        expect(widget.cssClass).toBe('cls1 cls3 cls2');
        expect(widget.$container).toHaveClass('cls1');
        expect(widget.$container).toHaveClass('cls2');
        expect(widget.$container).toHaveClass('cls3');
      });

    });
  });

  describe('focus', function() {

    it("sets the focus on the container", function() {
      var widget = createWidget({
        parent: parent
      });
      widget.render(session.$entryPoint);
      widget.focus();
      expect(document.activeElement).toBe(widget.$container[0]);
    });

    it("schedules the focus request if the widget is not rendered", function() {
      var widget = createWidget({
        parent: parent
      });
      widget.focus();
      widget.render(session.$entryPoint);
      widget.validateLayoutTree(); // <-- this triggers the focus to be set
      expect(document.activeElement).toBe(widget.$container[0]);
    });
  });

  describe('Widget properties', function() {

    it("automatically resolves referenced widgets", function() {
      window.testns = {};
      // ----- Define class "ComplexTestWidget" -----
      window.testns.ComplexTestWidget = function() {
        window.testns.ComplexTestWidget.parent.call(this);
        this._addWidgetProperties(['items', 'selectedItem']);
        this._addPreserveOnPropertyChangeProperties(['selectedItem']);
      };
      scout.inherits(window.testns.ComplexTestWidget, scout.Widget);
      // ----- Define class "TestItem" -----
      window.testns.TestItem = function() {
        window.testns.TestItem.parent.call(this);
        this._addWidgetProperties(['linkedItem']);
      };
      scout.inherits(window.testns.TestItem, scout.Widget);

      // Create an instance
      var model1 = {
        parent: parent,
        session: session,
        items: [{
          objectType: 'testns.TestItem',
          id: 'TI1',
          name: 'Item #1'
        }, {
          objectType: 'testns.TestItem',
          id: 'TI2',
          name: 'Item #2'
        }],
        selectedItem: 'TI2'
      };
      var ctw1 = scout.create('testns.ComplexTestWidget', model1);
      expect(ctw1.items.length).toBe(2);
      expect(ctw1.items[1].name).toBe('Item #2');
      expect(ctw1.selectedItem).toBe(ctw1.items[1]);

      // Create another instance with an invalid reference
      var model2 = {
        parent: parent,
        session: session,
        objectType: 'testns.ComplexTestWidget',
        items: [{
          objectType: 'testns.TestItem',
          id: 'TI1',
          name: 'Item #1'
        }],
        selectedItem: 'TI77'
      };
      expect(function() {
        scout.create(model2);
      }).toThrow(new Error('Referenced widget not found: TI77'));
      // fix it
      delete model2.selectedItem;
      var ctw2 = scout.create(model2);
      expect(ctw2.items.length).toBe(1);
      expect(ctw2.items[0].name).toBe('Item #1');
      expect(ctw2.items[0]).not.toBe(ctw1.items[0]); // not same!

      // Create another instance with unsupported references (same level)
      var model3 = {
        parent: parent,
        session: session,
        items: [{
          objectType: 'testns.TestItem',
          id: 'TI1',
          name: 'Item #1',
          linkedItem: 'TI2'
        }, {
          objectType: 'testns.TestItem',
          id: 'TI2',
          name: 'Item #2'
        }]
      };
      expect(function() {
        scout.create('testns.ComplexTestWidget', model3);
      }).toThrow(new Error('Referenced widget not found: TI2'));
      // fix it
      delete model3.items[0].linkedItem;
      var ctw3 = scout.create('testns.ComplexTestWidget', model3);
      ctw3.items[0].setProperty('linkedItem', ctw3.items[1]);
    });
  });

  describe('scrollTop', function() {
    beforeEach(function() {
      jasmine.clock().install();
    });

    afterEach(function() {
      jasmine.clock().uninstall();
    });

    it("is stored on scroll if scrollbars are installed", function() {
      var widget = new ScrollableWidget();
      widget.init({
        parent: parent,
        session: session
      });
      widget.render(session.$entryPoint);
      widget.$container[0].scrollTop = 40;
      widget.$container.trigger('scroll'); // Is executed later, trigger manually for testing
      expect(widget.scrollTop).toBe(40);
    });

    it("is not stored on scroll if scrollbars are not installed", function() {
      var widget = createWidget({
        parent: parent
      });
      expect(widget.scrollTop).toBe(null);

      widget.render(session.$entryPoint);
      widget.$container[0].scrollTop = 40;
      expect(widget.$container[0].scrollTop).toBe(0);
      widget.$container.trigger('scroll');
      expect(widget.scrollTop).toBe(null);
    });

    it("is applied again on render after remove", function() {
      var widget = new ScrollableWidget();
      widget.init({
        parent: parent,
        session: session
      });
      widget.render(session.$entryPoint);
      expect(widget.$container[0].scrollTop).toBe(0);
      expect(widget.$container[0].scrollHeight).toBe(100);

      widget.$container[0].scrollTop = 40;
      widget.$container.trigger('scroll');
      jasmine.clock().tick(500);
      expect(widget.scrollTop).toBe(40);

      widget.remove();
      widget.render(session.$entryPoint);
      expect(widget.scrollTop).toBe(40);
      expect(widget.$container[0].scrollTop).toBe(0);
      widget.revalidateLayoutTree(); // Scroll top will be rendered after the layout
      expect(widget.$container[0].scrollTop).toBe(40);
    });

    it("is set to null if scrollbars are not installed", function() {
      var widget = createWidget({
        parent: parent
      });
      expect(widget.scrollTop).toBe(null);

      spyOn(widget, '_renderScrollTop').and.callThrough();
      widget.render(session.$entryPoint);
      expect(widget._renderScrollTop.calls.count()).toBe(1);
      widget.revalidateLayoutTree(); // Scroll top will be rendered after the layout
      expect(widget._renderScrollTop.calls.count()).toBe(1); // Must not be executed again for non scrollable widgets
    });

    it("is set to null if scrollbars are uninstalled on the fly", function() {
      var widget = new ScrollableWidget();
      widget.init({
        parent: parent,
        session: session,
        scrollTop: 40
      });
      expect(widget.scrollTop).toBe(40);

      spyOn(widget, '_renderScrollTop').and.callThrough();
      widget.render(session.$entryPoint);
      expect(widget._renderScrollTop.calls.count()).toBe(1);
      widget.revalidateLayoutTree(); // Scroll top will be rendered after the layout
      expect(widget._renderScrollTop.calls.count()).toBe(2); // Is executed again after layout
      expect(widget.$container[0].scrollTop).toBe(40);

      widget._uninstallScrollbars();
      expect(widget.scrollTop).toBe(null);

      widget.remove();
      widget.render(session.$entryPoint);
      expect(widget._renderScrollTop.calls.count()).toBe(3);
      widget.revalidateLayoutTree();
      expect(widget._renderScrollTop.calls.count()).toBe(3); // Must not be executed again
      expect(widget.$container[0].scrollTop).toBe(0);
    });
  });

  describe('isEveryParentVisible', function() {

    var parentWidget1, parentWidget2, parentWidget3, testWidget;

    beforeEach(function() {
      parentWidget1 = createWidget();

      parentWidget2 = createWidget({
        parent: parentWidget1
      });

      parentWidget3 = createWidget({
        parent: parentWidget2
      });

      testWidget = createWidget({
        parent: parentWidget3
      });
    });

    it('should correctly calculate the parents visible state if all parents are visible', function() {
      expect(testWidget.isEveryParentVisible()).toBe(true);
    });

    it('should correctly calculate the parents visible state if one parent is invisible', function() {
      parentWidget1.setVisible(false);

      expect(testWidget.isEveryParentVisible()).toBe(false);

      parentWidget1.setVisible(true);
      parentWidget2.setVisible(false);

      expect(testWidget.isEveryParentVisible()).toBe(false);

      parentWidget2.setVisible(true);
      parentWidget3.setVisible(false);

      expect(testWidget.isEveryParentVisible()).toBe(false);
    });

    it('should correctly calculate the parents visible state if several parents are invisible', function() {
      parentWidget1.setVisible(false);
      parentWidget2.setVisible(false);

      // parent 1 and 2 are invisible
      expect(testWidget.isEveryParentVisible()).toBe(false);

      parentWidget2.setVisible(true);
      parentWidget3.setVisible(false);

      // parent 1 and 3 are invisible
      expect(testWidget.isEveryParentVisible()).toBe(false);

      parentWidget1.setVisible(true);
      parentWidget2.setVisible(false);

      // parent 2 and 3 are invisible
      expect(testWidget.isEveryParentVisible()).toBe(false);
    });

    it('should correctly calculate the parents visible state if all parents are invisible', function() {
      parentWidget1.setVisible(false);
      parentWidget2.setVisible(false);
      parentWidget3.setVisible(false);
      expect(testWidget.isEveryParentVisible()).toBe(false);
    });
  });
});
