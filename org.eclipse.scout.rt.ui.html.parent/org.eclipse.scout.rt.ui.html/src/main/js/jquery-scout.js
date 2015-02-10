/**
 * JQuery plugin with scout extensions
 */

/*global console: false */
(function($) {

  // === $ extensions ===

  // chris' shortcut
  $.l = console.log.bind(console);

  $.makeDiv = function(cssClass, htmlContent, id) {
    if (id === 0) {
      //Allow 0 as id (!id would result in false)
      id = '0';
    }
    return $('<div' +
      (id ? ' id="' + id + '"' : '') +
      (cssClass ? ' class="' + cssClass + '"' : '') +
      scout.device.unselectableAttribute +
      '>' +
      (htmlContent || '') +
      '</div>'
    );
  };

  $.makeSVG = function(type, id, cssClass, htmlContent) {
    var $svgElement = $(document.createElementNS('http://www.w3.org/2000/svg', type));
    if (id) {
      $svgElement.attr('id', id);
    }
    if (cssClass) {
      $svgElement.attr('class', cssClass);
    }
    if (htmlContent) {
      $svgElement.html(htmlContent);
    }
    return $svgElement;
  };

  // used by some animate functions
  $.removeThis = function() {
    $(this).remove();
  };

  /**
   * Convenience function that can be used as an jQuery event handler, when
   * this event should be "swallowed". Technically, this function just calls
   * 'stopPropagation()' on the event.
   */
  $.suppressEvent = function(event) {
    event.stopPropagation();
  };

  /**
   * Implements the 'debounce' pattern. The given function fx is executed after a certain delay
   * (in milliseconds), but if the same function is called a second time within the waiting time,
   * the timer is reset. The default value for 'delay' is 250 ms.
   */
  $.debounce = function(fx, delay) {
    var delayer = null;
    delay = (typeof delay !== 'undefined') ? delay : 250;
    return function() {
      var that = this,
        args = arguments;
      clearTimeout(delayer);
      delayer = setTimeout(function() {
        fx.apply(that, args);
      }, delay);
    };
  };

  /**
   * from http://api.jquery.com/jquery.getscript/
   */
  $.getCachedScript = function(url, options) {
    options = $.extend(options || {}, {
      dataType: 'script',
      cache: true,
      url: url
    });
    return jQuery.ajax(options);
  };

  // === $.prototype extensions ===

  // prepend - and return new div for chaining
  $.fn.prependDiv = function(cssClass, htmlContent, id) {
    return $.makeDiv(cssClass, htmlContent, id).prependTo(this);
  };

  // append - and return new div for chaining
  $.fn.appendDiv = function(cssClass, htmlContent, id) {
    return $.makeDiv(cssClass, htmlContent, id).appendTo(this);
  };

  // insert after - and return new div for chaining
  $.fn.afterDiv = function(cssClass, htmlContent, id) {
    return $.makeDiv(cssClass, htmlContent, id).insertAfter(this);
  };

  // insert before - and return new div for chaining
  $.fn.beforeDiv = function(cssClass, htmlContent, id) {
    return $.makeDiv(cssClass, htmlContent, id).insertBefore(this);
  };

  // append svg
  $.fn.appendSVG = function(type, id, cssClass, htmlContent) {
    return $.makeSVG(type, id, cssClass, htmlContent).appendTo(this);
  };

  $.pxToNumber = function(pixel) {
    // parseInt ignores 'px' and just extracts the number
    return parseInt(pixel, 10);
  };

  // attr and class handling for svg
  $.fn.attrSVG = function(attributeName, value) {
    return this.each(function() {
      this.setAttribute(attributeName, value);
    });
  };

  $.fn.attrXLINK = function(attributeName, value) {
    return this.each(function() {
      this.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:' + attributeName, value);
    });
  };

  $.fn.addClassSVG = function(cssClass) {
    return this.each(function() {
      if (!$(this).hasClassSVG(cssClass)) {
        var old = this.getAttribute('class');
        this.setAttribute('class', old + ' ' + cssClass);
      }
    });
  };

  $.fn.removeClassSVG = function(cssClass) {
    return this.each(function() {
      var old = ' ' + this.getAttribute('class') + ' ';
      this.setAttribute('class', old.replace(' ' + cssClass + ' ', ' '));
    });
  };

  $.fn.hasClassSVG = function(cssClass) {
    var old = ' ' + this.attr('class') + ' ';
    return old.indexOf(' ' + cssClass + ' ') > -1;
  };

  // select one and deselect siblings
  $.fn.selectOne = function() {
    this.siblings().removeClass('selected');
    this.addClass('selected');
    return this;
  };

  $.fn.select = function(selected) {
    return this.toggleClass('selected', selected);
  };

  $.fn.isSelected = function() {
    return this.hasClass('selected');
  };

  $.fn.setEnabled = function(enabled) {
    enabled = !!enabled;
    this.data('enabled', enabled);
    this.toggleClass('disabled', !enabled);
    // Toggle disabled attribute for elements that support it (see http://www.w3.org/TR/html5/disabled-elements.html)
    if (this.is('button, input, select, textarea, optgroup, option, fieldset')) {
      if (enabled) {
        this.removeAttr('disabled');
      }
      else {
        this.attr('disabled', 'disabled');
      }
    }
    return this;
  };

  $.fn.isEnabled = function() {
    return this.data('enabled') !== false;
  };

  $.fn.setVisible = function(visible) {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
    return this;
  };

  $.fn.icon = function(iconId) {
    if (iconId) {
      this.attr('data-icon', iconId);
    } else {
      this.removeAttr('data-icon');
    }
    return this;
  };

  $.fn.placeholder = function(placeholder) {
    if (placeholder) {
      this.attr('placeholder', placeholder);
    } else {
      this.removeAttr('placeholder');
    }
    return this;
  };

  /**
   * Returns false when the component display is 'none' or visibility is 'hidden', otherwise true.
   * Note: this gives other results than $.is(':visible'), since that method will also return false
   * when a component has absolute positioning and no width and height is defined (well, you cannot
   * see a component with a style like this, but technically it is not set to 'not visible').
   */
  $.fn.isVisible = function() {
    if ('none' === this.css('display')) {
      return false;
    }
    if ('hidden' === this.css('visibility')) {
      return false;
    }
    return true;
  };

  /**
   * @return true if the element is attached (= is in the dom tree), false if not
   */
  $.fn.isAttached = function() {
    return $.contains(document.documentElement, this[0]);
  };

  // most used animate
  $.fn.animateAVCSD = function(attr, value, complete, step, duration) {
    var properties = {};
    var options = {};

    properties[attr] = value;
    if (complete) {
      options.complete = complete;
    }
    if (step) {
      options.step = step;
    }
    if (duration) {
      options.duration = duration;
    }
    options.queue = false;

    this.animate(properties, options);
    return this;
  };

  // SVG animate, array contains attr, endValue + startValue
  $.fn.animateSVG = function(attr, endValue, duration, complete) {
    return this.each(function() {
      var startValue = parseFloat($(this).attr(attr));

      $(this).animate({
        tabIndex: 0
      }, {
        step: function(now, fx) {
          this.setAttribute(attr, startValue + (endValue - startValue) * fx.pos);
        },
        duration: duration,
        complete: complete,
        queue: false
      });
    });
  };

  // over engineered animate
  $.fn.widthToContent = function(duration) {
    if (typeof duration === 'undefined') {
      duration = 300;
    }

    var oldW = this.outerWidth(),
      newW = this.css('width', 'auto').outerWidth(),
      finalWidth = this.data('finalWidth');
    if (newW !== oldW) {
      this.css('width', oldW);
    }

    if (newW !== finalWidth) {
      this.data('finalWidth', newW);
      this.stop().animateAVCSD('width', newW, function() {
        $(this).data('finalWidth', null);
      }, null, duration);
    }

    return this;
  };

  $.fn.heightToContent = function(duration) {
    if (typeof duration === 'undefined') {
      duration = 300;
    }

    var oldH = this.outerHeight(),
      newH = this.css('height', 'auto').outerHeight(),
      finalHeight = this.data('finalHeight');
    if (newH !== oldH) {
      this.css('height', oldH);
    }

    if (newH !== finalHeight) {
      this.data('finalHeight', newH);
      this.stop().animateAVCSD('height', newH, function() {
        $(this).data('finalHeight', null);
      }, null, duration);
    }

    return newH;
  };

  $.fn.cssLeft = function(position) {
    return this.css('left', position + 'px');
  };

  $.fn.cssTop = function(position) {
    return this.css('top', position + 'px');
  };

  $.fn.cssRight = function(position) {
    return this.css('right', position + 'px');
  };

  $.fn.cssWidth = function(width) {
    return this.css('width', width + 'px');
  };

  $.fn.cssHeight = function(height) {
    return this.css('height', height + 'px');
  };

  $.fn.cssLineHeight = function(height) {
    return this.css('line-height', height + 'px');
  };

  $.fn.cssPxValue = function(prop, value) {
    if (value === undefined) {
      return $.pxToNumber(this.css(prop));
    }
    return this.css(prop, value + 'px');
  };

  $.fn.cssMarginLeft = function(value) {
    return this.cssPxValue('margin-left', value);
  };

  $.fn.cssMarginBottom = function(value) {
    return this.cssPxValue('margin-bottom', value);
  };

  $.fn.cssMarginRight = function(value) {
    return this.cssPxValue('margin-right', value);
  };

  $.fn.cssMarginTop = function(value) {
    return this.cssPxValue('margin-top', value);
  };

  $.fn.cssBorderBottomWidth = function(value) {
    return this.cssPxValue('border-bottom-width', value);
  };

  $.fn.cssBorderLeftWidth = function(value) {
    return this.cssPxValue('border-left-width', value);
  };

  $.fn.cssBorderRightWidth = function(value) {
    return this.cssPxValue('border-right-width', value);
  };

  $.fn.cssBorderTopWidth = function(value) {
    return this.cssPxValue('border-top-width', value);
  };

  /**
   * Bottom of a html element without margin and border relative to offset parent. Expects border-box model.
   */
  $.fn.innerBottom = function() {
    return this.position().top + this.outerHeight(true) - this.cssMarginBottom() - this.cssBorderBottomWidth();
  };

  /**
   * Right of a html element without margin and border relative to offset parent. Expects border-box model.
   */
  $.fn.innerRight = function() {
    return this.position().left + this.outerWidth(true) - this.cssMarginRight() - this.cssBorderRightWidth();
  };

  $.fn.disableSpellcheck = function() {
    return this.attr('spellcheck', false);
  };

  /**
   * Makes any element movable with the mouse. If the argument '$handle' is missing, the entire
   * element can be used as a handle.
   */
  $.fn.makeDraggable = function($handle) {
    var $draggable = this;
    $handle = $handle || $draggable;
    return $handle.on("mousedown.draggable", function(event) {
      var orig_offset = $draggable.offset();
      var orig_event = event;
      $handle.parents()
        .on("mousemove.dragging", function(event) {
          $draggable.offset({
            top: orig_offset.top + (event.pageY - orig_event.pageY),
            left: orig_offset.left + (event.pageX - orig_event.pageX)
          });
        })
        .on("mouseup.dragging", function(e) {
          $handle.parents().off('.dragging');
        });
      event.preventDefault();
    });
  };

}(jQuery));
