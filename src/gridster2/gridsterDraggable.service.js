(function () {
  'use strict';

  angular.module('angular-gridster2')
    .service('GridsterDraggable', GridsterDraggable);

  /** @ngInject */
  function GridsterDraggable(GridsterPush, GridsterSwap, GridsterScroll) {
    return function (gridsterItem, gridster) {
      var vm = this;
      vm.offsetLeft = 0;
      vm.offsetTop = 0;
      vm.margin = 0;
      vm.diffTop = 0;
      vm.diffLeft = 0;
      vm.top = 0;
      vm.left = 0;
      vm.height = 0;
      vm.width = 0;
      vm.positionX = 0;
      vm.positionY = 0;
      vm.positionXBackup = 0;
      vm.positionYBackup = 0;
      vm.enabled = false;
      vm.dragStartFunction = angular.noop;
      vm.dragFunction = angular.noop;
      vm.dragStopFunction = angular.noop;
      vm.push = undefined;
      vm.swap = undefined;
      vm.gridsterItem = gridsterItem;
      vm.gridster = gridster;
      vm.lastMouse = {
        pageX: 0,
        pageY: 0
      };
      vm.path = [];

      function touchEvent(e) {
        e.pageX = e.touches[0].pageX;
        e.pageY = e.touches[0].pageY;
      }

      vm.checkContentClass = function (target, current, contentClass) {
        if (target === current) {
          return false;
        }
        if (target.classList && target.classList.contains(contentClass)) {
          return true;
        } else {
          return vm.checkContentClass(target.parentNode, current, contentClass);
        }
      };

      vm.dragStart = function (e) {
        switch (e.which) {
          case 1:
            // left mouse button
            break;
          case 2:
          case 3:
            // right or middle mouse button
            return;
        }

        if (vm.gridster.$options.draggable.ignoreContent) {
          if (!vm.checkContentClass(e.target, e.currentTarget, vm.gridster.$options.draggable.dragHandleClass)) {
            return;
          }
        } else {
          if (vm.checkContentClass(e.target, e.currentTarget, vm.gridster.$options.draggable.ignoreContentClass)) {
            return;
          }
        }

        if (vm.gridster.$options.draggable.start) {
          vm.gridster.$options.draggable.start(vm.gridsterItem.item, vm.gridsterItem, e);
        }

        e.stopPropagation();
        e.preventDefault();
        if (e.pageX === undefined && e.touches) {
          touchEvent(e);
        }
        vm.dragFunction = vm.dragMove.bind(this);
        vm.dragStopFunction = vm.dragStop.bind(this);

        document.addEventListener('mousemove', vm.dragFunction);
        document.addEventListener('mouseup', vm.dragStopFunction);
        document.addEventListener('touchmove', vm.dragFunction);
        document.addEventListener('touchend', vm.dragStopFunction);
        document.addEventListener('touchcancel', vm.dragStopFunction);
        vm.gridsterItem.el.addClass('gridster-item-moving');
        vm.margin = vm.gridster.$options.margin;
        vm.offsetLeft = vm.gridster.el.scrollLeft - vm.gridster.el.offsetLeft;
        vm.offsetTop = vm.gridster.el.scrollTop - vm.gridster.el.offsetTop;
        vm.left = vm.gridsterItem.left;
        vm.top = vm.gridsterItem.top;
        vm.width = vm.gridsterItem.width;
        vm.height = vm.gridsterItem.height;
        vm.diffLeft = e.pageX + vm.offsetLeft - vm.margin - vm.left;
        vm.diffTop = e.pageY + vm.offsetTop - vm.margin - vm.top;
        vm.gridster.movingItem = vm.gridsterItem;
        vm.gridster.previewStyle();
        vm.push = new GridsterPush(vm.gridsterItem, vm.gridster);
        vm.swap = new GridsterSwap(vm.gridsterItem, vm.gridster);
        vm.gridster.gridLines.updateGrid(true);
        vm.path.push({x: vm.gridsterItem.item.x, y: vm.gridsterItem.item.y});
      };

      vm.dragMove = function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.pageX === undefined && e.touches) {
          touchEvent(e);
        }
        vm.offsetLeft = vm.gridster.el.scrollLeft - vm.gridster.el.offsetLeft;
        vm.offsetTop = vm.gridster.el.scrollTop - vm.gridster.el.offsetTop;
        GridsterScroll(vm.gridsterItem, e, vm.lastMouse, vm.calculateItemPositionFromMousePosition.bind(this));

        vm.calculateItemPositionFromMousePosition(e);

        vm.lastMouse.pageX = e.pageX;
        vm.lastMouse.pageY = e.pageY;
      };

      vm.calculateItemPositionFromMousePosition = function (e) {
        vm.left = e.pageX + vm.offsetLeft - vm.margin - vm.diffLeft;
        vm.top = e.pageY + vm.offsetTop - vm.margin - vm.diffTop;
        vm.calculateItemPosition();
      };

      vm.dragStop = function (e) {
        e.stopPropagation();
        e.preventDefault();
        GridsterScroll.cancelScroll();
        document.removeEventListener('mousemove', vm.dragFunction);
        document.removeEventListener('mouseup', vm.dragStopFunction);
        document.removeEventListener('touchmove', vm.dragFunction);
        document.removeEventListener('touchend', vm.dragStopFunction);
        document.removeEventListener('touchcancel', vm.dragStopFunction);
        vm.gridsterItem.el.removeClass('gridster-item-moving');
        vm.gridster.movingItem = null;
        vm.gridster.previewStyle();
        vm.gridster.gridLines.updateGrid(false);
        vm.path = [];
        if (vm.gridster.$options.draggable.stop) {
          var promise = vm.gridster.$options.draggable.stop(vm.gridsterItem.item, vm.gridsterItem, e);
          if (promise && promise.then) {
            promise.then(vm.makeDrag.bind(this), vm.cancelDrag.bind(this));
          } else {
            vm.makeDrag();
          }
        } else {
          vm.makeDrag();
        }
      };

      vm.cancelDrag = function () {
        vm.gridsterItem.$item.x = vm.gridsterItem.item.x;
        vm.gridsterItem.$item.y = vm.gridsterItem.item.y;
        vm.gridsterItem.setSize(true);
        vm.push.restoreItems();
        vm.push = undefined;
        vm.swap.restoreSwapItem();
        vm.swap = undefined;
      };

      vm.makeDrag = function () {
        vm.gridsterItem.setSize(true);
        vm.gridsterItem.checkItemChanges(vm.gridsterItem.$item, vm.gridsterItem.item);
        vm.push.setPushedItems();
        vm.push = undefined;
        vm.swap.setSwapItem();
        vm.swap = undefined;
      };

      vm.calculateItemPosition = function () {
        vm.positionX = vm.gridster.pixelsToPositionX(vm.left, Math.round);
        vm.positionY = vm.gridster.pixelsToPositionY(vm.top, Math.round);
        vm.positionXBackup = vm.gridsterItem.$item.x;
        vm.positionYBackup = vm.gridsterItem.$item.y;
        vm.gridsterItem.$item.x = vm.positionX;
        vm.gridsterItem.$item.y = vm.positionY;
        if (vm.gridster.checkGridCollision(vm.gridsterItem.$item)) {
          vm.gridsterItem.$item.x = vm.positionXBackup;
          vm.gridsterItem.$item.y = vm.positionYBackup;
          return;
        }

        vm.gridsterItem.el.css('left', vm.left + 'px');
        vm.gridsterItem.el.css('top', vm.top + 'px');

        if (vm.positionXBackup !== vm.gridsterItem.$item.x || vm.positionYBackup !== vm.gridsterItem.$item.y) {
          var lastPosition = vm.path[vm.path.length - 1];
          var direction;
          if (lastPosition.x < vm.gridsterItem.$item.x) {
            direction = vm.push.fromWest;
          } else if (lastPosition.x > vm.gridsterItem.$item.x) {
            direction = vm.push.fromEast;
          } else if (lastPosition.y < vm.gridsterItem.$item.y) {
            direction = vm.push.fromNorth;
          } else if (lastPosition.y > vm.gridsterItem.$item.y) {
            direction = vm.push.fromSouth;
          }
          vm.push.pushItems(direction);
          vm.swap.swapItems();
          if (vm.gridster.checkCollision(vm.gridsterItem.$item)) {
            vm.gridsterItem.$item.x = vm.positionXBackup;
            vm.gridsterItem.$item.y = vm.positionYBackup;
          } else {
            vm.path.push({x: vm.gridsterItem.$item.x, y: vm.gridsterItem.$item.y});
            vm.gridster.previewStyle();
          }
          vm.push.checkPushBack();
        }
      };

      vm.toggle = function (enable) {
        var enableDrag = !vm.gridster.mobile &&
          (vm.gridsterItem.$item.dragEnabled === undefined ? enable : vm.gridsterItem.$item.dragEnabled);
        if (!vm.enabled && enableDrag) {
          vm.enabled = !vm.enabled;
          vm.dragStartFunction = vm.dragStart.bind(this);
          vm.gridsterItem.nativeEl.addEventListener('mousedown', vm.dragStartFunction);
          vm.gridsterItem.nativeEl.addEventListener('touchstart', vm.dragStartFunction);
        } else if (vm.enabled && !enableDrag) {
          vm.enabled = !vm.enabled;
          vm.gridsterItem.nativeEl.removeEventListener('mousedown', vm.dragStartFunction);
          vm.gridsterItem.nativeEl.removeEventListener('touchstart', vm.dragStartFunction);
        }
      };
    };
  }
})();
