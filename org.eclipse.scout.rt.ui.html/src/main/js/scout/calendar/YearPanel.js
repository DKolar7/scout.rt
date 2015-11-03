/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.YearPanel = function() {
  scout.YearPanel.parent.call(this);

  this.$container;
  this.$yearTitle;
  this.$yearList;
  this.selectedDate;
  this.displayMode;
  this._addEventSupport();
};
scout.inherits(scout.YearPanel, scout.Widget);

scout.YearPanel.prototype._render = function($parent) {
  this.$container = $parent.appendDiv('year-panel-container');
  this.$yearTitle = this.$container.appendDiv('year-panel-title');
  this.$yearList = this.$container.appendDiv('year-panel-list');
};

scout.YearPanel.prototype.renderContent = function() {
  this.removeContent();
  this._drawYear();
  scout.scrollbars.install(this.$yearList, {
    parent: this,
    axis: 'y'
  });
  this.yearRendered = true;
  this._colorYear();
};

scout.YearPanel.prototype.removeContent = function() {
  scout.scrollbars.uninstall(this.$yearList, this.session);
  this.$yearList.empty();
  this.yearRendered = false;
};

scout.YearPanel.prototype._remove = function() {
  this.removeContent();
  scout.YearPanel.parent.prototype._remove.call(this);
};

scout.YearPanel.prototype._drawYear = function() {
  var first, month, $month, d, day, $day,
    year = this.selectedDate.getFullYear();

  // append 3 years
  this.$yearTitle
    .data('year', year)
    .empty();

  this.$yearTitle.appendDiv('year-title-item', year - 1)
    .data('year-diff', -1)
    .click(this._onYearClick.bind(this));

  this.$yearTitle.appendDiv('year-title-item selected', year);

  this.$yearTitle.appendDiv('year-title-item', year + 1)
    .data('year-diff', +1)
    .click(this._onYearClick.bind(this));

  // add months and days
  for (month = 0; month < 12; month++) {
    first = new Date(year, month, 1);
    $month = this.$yearList.appendDiv('year-month').attr('data-title', this._format(first, 'MMMM'));
    for (d = 1; d <= 31; d++) {
      day = new Date(year, month, d);

      // stop if day is already out of range
      if (day.getMonth() !== month) {
        break;
      }

      // add div per day
      $day = $month.appendDiv('year-day', d).data('date', day);

      if (day.getDay() === 0 || day.getDay() === 6) {
        $day.addClass('weekend');
      }

      // first day has margin depending on weekday
      if (d === 1) {
        $day.css('margin-left', ((day.getDay() + 6) % 7) * $day.outerWidth());
      }
    }
  }

  // bind events for days divs
  $('.year-day', this.$yearList)
    .click(this._onYearDayClick.bind(this))
    .hover(this._onYearHoverIn.bind(this), this._onYearHoverOut.bind(this));

  // update scrollbar
  scout.scrollbars.update(this.$yearList);
};

scout.YearPanel.prototype._colorYear = function() {
  if (!this.yearRendered) {
    return;
  }

  // remove color information
  $('.year-day.year-range, .year-day.year-range-day', this.$yearList).removeClass('year-range year-range-day');

  // loop all days and colorize based on range and selected
  var that = this,
    $day, date;

  $('.year-day', this.$yearList).each(function() {
    $day = $(this);
    date = $day.data('date');

    if (!that._isDisplayModeDay() && date >= that.viewRange.from && date <= that.viewRange.to) {
      $day.addClass('year-range');
    }

    if (scout.dates.isSameDay(date, that.selectedDate)) {
      $day.addClass('year-range-day');
    }
  });

  // selected has to be visible day
  this._scrollYear();
};

scout.YearPanel.prototype._scrollYear = function() {
  var top, halfMonth, halfYear,
    $day = $('.year-range-day', this.$yearList),
    $month = $day.parent(),
    $year = $day.parent().parent();

  if (!$month[0]) {
    return;
  }
  top = $month[0].offsetTop,
    halfMonth = $month.outerHeight() / 2,
    halfYear = $year.outerHeight() / 2;

  this.$yearList.animateAVCSD('scrollTop', top + halfMonth - halfYear);
};

scout.YearPanel.prototype._format = function(date, pattern) {
  return scout.dates.format(date, this.session.locale, pattern);
};

scout.YearPanel.prototype.selectDate = function(date) {
  this.selectedDate = date;

  if (this.rendered) {
    // If year shown and changed, redraw year
    if (!date || date.getFullYear() !== this.$yearTitle.data('year')) {
      this.renderContent();
    }
    this._colorYear();
  }
};

scout.YearPanel.prototype.setDisplayMode = function(displayMode) {
  if (displayMode === this.displayMode) {
    return;
  }
  this.displayMode = displayMode;
  if (this.rendered) {
    this._colorYear();
  }
};

scout.YearPanel.prototype.setViewRange = function(viewRange) {
  if (viewRange === this.viewRange) {
    return;
  }
  this.viewRange = viewRange;
  if (this.rendered) {
    this._colorYear();
  }
};

scout.YearPanel.prototype._isDisplayModeDay = function() {
  return this.displayMode === scout.Planner.DisplayMode.DAY;
};

scout.YearPanel.prototype._isDisplayModeWeek = function() {
  return this.displayMode === scout.Planner.DisplayMode.WEEK;
};

scout.YearPanel.prototype._isDisplayModeMonth = function() {
  return this.displayMode === scout.Planner.DisplayMode.MONTH;
};

scout.YearPanel.prototype._isDisplayModeWork = function() {
  return this.displayMode === scout.Planner.DisplayMode.WORK;
};

scout.YearPanel.prototype._isDisplayModeCalendarWeek = function() {
  return this.displayMode === scout.Planner.DisplayMode.CALENDAR_WEEK;
};

scout.YearPanel.prototype._isDisplayModeYear = function() {
  return this.displayMode === scout.Planner.DisplayMode.YEAR;
};

/* -- events ---------------------------------------- */

scout.YearPanel.prototype._onYearClick = function(event) {
  var diff = $(event.target).data('year-diff'),
    year = this.selectedDate.getFullYear(),
    month = this.selectedDate.getMonth(),
    date = this.selectedDate.getDate();
  this.selectedDate = new Date(year + diff, month, date);
  this.trigger('dateSelect', {
    date: this.selectedDate
  });
};

scout.YearPanel.prototype._onYearDayClick = function(event) {
  this.selectedDate = $('.year-hover-day', this.$yearList).data('date');
  if (this.selectedDate) {
    this.trigger('dateSelect', {
      date: this.selectedDate
    });
  }
};

scout.YearPanel.prototype._onYearHoverIn = function(event) {
  // init vars
  var $day = $(event.target),
    date1 = $day.data('date'),
    year = date1.getFullYear(),
    month = date1.getMonth(),
    date = date1.getDate(),
    day = (date1.getDay() + 6) % 7,
    that = this,
    startHover,
    endHover,
    $day2, date2;

  // find hover based on mode
  // in case of planner: selected day is first day of week, hover only for days and weeks
  if (this.$container.parent().hasClass('planner')) {
    if (this._isDisplayModeDay()) {
      startHover = new Date(year, month, date);
      endHover = new Date(year, month, date);
    } else if (this._isDisplayModeWeek()) {
      startHover = new Date(year, month, date - day);
      endHover = new Date(year, month, date - day + 6);
    } else if (this._isDisplayModeWork()) {
      startHover = new Date(year, month, date - day);
      endHover = new Date(year, month, date - day + 4);
    } else if (this._isDisplayModeYear()) {
      startHover = new Date(year, month, 1);
      endHover = startHover;
    } else {
      startHover = new Date(year, month, date - day);
      endHover = startHover;
    }

    date1 = startHover;
  } else {
    if (this._isDisplayModeDay()) {
      startHover = new Date(year, month, date);
      endHover = new Date(year, month, date);
    } else if (this._isDisplayModeWeek()) {
      startHover = new Date(year, month, date - day);
      endHover = new Date(year, month, date - day + 6);
    } else if (this._isDisplayModeMonth()) {
      startHover = new Date(year, month, 1);
      endHover = new Date(year, month + 1, 0);
    } else if (this._isDisplayModeWork()) {
      startHover = new Date(year, month, date - day);
      endHover = new Date(year, month, date - day + 4);
      // in case of work week: selected date has to be opart of range
      if (date1 > endHover) {
        date1 = endHover;
      }
    }
  }

  // loop days and colorize based on hover start and hover end
  $('.year-day', this.$yearList).each(function() {
    $day2 = $(this);
    date2 = $day2.data('date');
    if (date2 >= startHover && date2 <= endHover) {
      $day2.addClass('year-hover');
    } else {
      $day2.removeClass('year-hover');
    }
    if (scout.dates.isSameDay(date1, date2)) {
      $day2.addClass('year-hover-day');
    }
  });
};

// remove all hover effects
scout.YearPanel.prototype._onYearHoverOut = function(event) {
  $('.year-day.year-hover, .year-day.year-hover-day', this.$yearList).removeClass('year-hover year-hover-day');
};
