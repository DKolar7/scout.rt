/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
/**
 *
 */
/*
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
describe("scout.models", function() {

  describe('get', function() {

    var models = {
      model: {
        type: 'model',
        value: 'modelValue'
      },
      extension: {
        type: 'model',
        value: 'extensionValue'
      },
      object: {
        value: 'objectValue'
      }
    };

    beforeEach(function() {
      scout.models.init(models);
    });

    it('load object without type possible', function() {
      expect(scout.models._get('object', 'model').value).toBe('objectValue');
    });

    it('ensure the object is a copy', function() {
      scout.models._get('model', 'model').value = 'changed';
      expect(scout.models._get('model', 'model').value).toBe('modelValue');
    });

  });

  describe('extend', function() {

    var parentObj;

    var originalparent = {
      id: 'parent',
      color: 'red',
      text: 'test',
      rootContainer: {
        id: 'root',
        text: 'rootContainer',
        childs: [{
            id: 'child1',
            value: 1
          }, {
            id: 'child2',
            value: 2,
            childs: [{
                id: 'child3',
                value: 3
              }

            ]
          }, {
            id: 'child4',
            value: 4
          }

        ]
      }
    };

    var newPropertyInRoot = {
      extensions: [{
        operation: 'appendTo',
        target: {
          root: true
        },
        extension: {
          newColor: 'green'
        }
      }]
    };

    var overridePropertyInRoot = {
      extensions: [{
        operation: 'appendTo',
        target: {
          root: true
        },
        extension: {
          color: 'yellow'
        }
      }]
    };

    var overridePropertyInTree = {
      extensions: [{
        operation: 'appendTo',
        target: {
          id: 'child2'
        },
        extension: {
          value: 'property in tree overriden'
        }
      }]
    };

    var newObjectNoArrayInRoot = {
      extensions: [{
        operation: 'insert',
        target: {
          root: true,
          property: 'array'
        },
        extension: {
          id: 'newObj',
          value: 'inserted into non existing Array'
        }
      }]
    };

    var newObjectInTree = {
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs'
        },
        extension: {
          id: 'newObj',
          value: 'new object in tree'
        }
      }]
    };

    var newObjectTreeInTree = {
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs'
        },
        extension: {
          id: 'newObjTree',
          value: 15,
          childs: [{
            id: 'newObj',
            value: 'new object tree in tree'
          }]
        }
      }]
    };

    var newObjectInTreeIndexed = {
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs',
          index: 0
        },
        extension: {
          id: 'newObj',
          value: 'fixed index insert'
        }
      }]
    };

    var newObjectInTreeRelativeindex = {
      type: 'extension',
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs',
          before: 'child3'
        },
        extension: {
          id: 'newObj',
          value: 'relative index insert'
        }
      }]
    };

    var newObjectInTreeRelativeindexWithArray = {
      type: 'extension',
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs',
          before: 'child3'
        },
        extension: [{
          id: 'newObj',
          value: 'relative index insert'
        }, {
          id: 'newObj2',
          value: 'relative index insert2'
        }]
      }]
    };

    var newObjectgroupWithTarget = {
      type: 'extension',
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs',
          before: 'child3',
          groupWithTarget: true
        },
        extension: {
          id: 'newObjBound'
        }
      }]
    };

    var newObjectArraygroupWithTarget = {
      type: 'extension',
      extensions: [{
        operation: 'insert',
        target: {
          id: 'child2',
          property: 'childs',
          before: 'child3',
          groupWithTarget: true
        },
        extension: [{
          id: 'newObjBound'
        }, {
          id: 'newObjBound2'
        }]
      }]
    };

    beforeEach(function() {
      parentObj = $.extend(true, {}, originalparent);
    });

    it('insert new property into root object', function() {
      scout.models.extend(newPropertyInRoot, parentObj);
      expect(parentObj.newColor).toBe('green');
    });
    it('override property in root object', function() {
      scout.models.extend(overridePropertyInRoot, parentObj);
      expect(parentObj.color).toBe('yellow');
    });
    it('insert new property into a non existing array on root object', function() {
      scout.models.extend(newObjectNoArrayInRoot, parentObj);
      expect(parentObj.array[0].value).toBe('inserted into non existing Array');
    });
    it('override property in tree object', function() {
      scout.models.extend(overridePropertyInTree, parentObj);
      expect(parentObj.rootContainer.childs[1].value).toBe('property in tree overriden');
    });
    it('insert new object into tree object', function() {
      scout.models.extend(newObjectInTree, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[1].value).toBe('new object in tree');
    });
    it('insert new object tree into tree object', function() {
      scout.models.extend(newObjectTreeInTree, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[1].childs[0].value).toBe('new object tree in tree');
    });
    it('insert new object into tree object with fixed index', function() {
      scout.models.extend(newObjectInTreeIndexed, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[0].value).toBe('fixed index insert');
    });
    it('insert new object into tree object with relative index', function() {
      scout.models.extend(newObjectInTreeRelativeindex, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[0].value).toBe('relative index insert');
    });
    it('insert new object into tree object with relative index and two extension elements', function() {
      scout.models.extend(newObjectInTreeRelativeindexWithArray, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[0].value).toBe('relative index insert');
      expect(parentObj.rootContainer.childs[1].childs[1].value).toBe('relative index insert2');
    });
    it('insert object referenced by String', function() {
      var models = {};
      models.newObjectInTreeRelativeindex = newObjectInTreeRelativeindex;
      scout.models.init(models);
      scout.models.extend('newObjectInTreeRelativeindex', parentObj);
      expect(parentObj.rootContainer.childs[1].childs[0].value).toBe('relative index insert');
    });
    it('insert object bound to field', function() {
      scout.models.extend(newObjectgroupWithTarget, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[0].groupedWith).toBe('child3');

      scout.models.extend(newObjectInTreeRelativeindexWithArray, parentObj);

      expect(parentObj.rootContainer.childs[1].childs[0].id).toBe('newObj');
      expect(parentObj.rootContainer.childs[1].childs[1].id).toBe('newObj2');
      expect(parentObj.rootContainer.childs[1].childs[2].id).toBe('newObjBound');
      expect(parentObj.rootContainer.childs[1].childs[3].id).toBe('child3');

    });

    it('insert objects array bound to field', function() {
      scout.models.extend(newObjectArraygroupWithTarget, parentObj);
      expect(parentObj.rootContainer.childs[1].childs[0].groupedWith).toBe('child3');
      expect(parentObj.rootContainer.childs[1].childs[1].groupedWith).toBe('child3');

      scout.models.extend(newObjectInTreeRelativeindexWithArray, parentObj);

      expect(parentObj.rootContainer.childs[1].childs[0].id).toBe('newObj');
      expect(parentObj.rootContainer.childs[1].childs[1].id).toBe('newObj2');
      expect(parentObj.rootContainer.childs[1].childs[2].id).toBe('newObjBound');
      expect(parentObj.rootContainer.childs[1].childs[3].id).toBe('newObjBound2');
      expect(parentObj.rootContainer.childs[1].childs[4].id).toBe('child3');

    });

  });

});
