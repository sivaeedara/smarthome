angular.module('PaperUI.controllers.configuration').controller('ItemSetupController', function($scope, $timeout, $mdDialog, $filter, itemService, toastService, sharedProperties) {
    $scope.setSubtitle([ 'Items' ]);
    $scope.setHeaderText('Shows all configured Items.');
    $scope.items = [];
    $scope.refresh = function() {
        itemService.getNonRecursiveAll(function(items) {
            $scope.items = items;
        });

    };
    $scope.remove = function(item, event) {
        event.stopImmediatePropagation();
        $mdDialog.show({
            controller : 'ItemRemoveController',
            templateUrl : 'partials/dialog.removeitem.html',
            targetEvent : event,
            hasBackdrop : true,
            locals : {
                item : item
            }
        }).then(function() {
            $scope.refresh();
        });
    }
    $scope.getSrcURL = function(category, type) {
        return category ? '../icon/' + category.toLowerCase() : type ? '../icon/' + type.toLowerCase().replace('item', '') : '';
    }
    $scope.refresh();
}).controller('ItemConfigController', function($scope, $mdDialog, $filter, $location, toastService, itemService, itemConfig, itemRepository) {
    $scope.items = [];
    $scope.oldCategory;
    $scope.types = itemConfig.types;
    $scope.groupTypes = itemConfig.groupTypes;
    $scope.functions = [];
    $scope.selectedMember = null;
    $scope.selectedParent = null;
    $scope.searchText = null;
    $scope.childItems = [];
    $scope.groupNames = [];
    var itemName;
    var originalItem = {};
    if ($scope.path && $scope.path.length > 4) {
        itemName = $scope.path[4];
    }
    itemService.getNonRecursiveAll(function(items) {
        $scope.items = items;
        if (itemName) {
            var items = $filter('filter')(items, {
                name : itemName
            });
            if (items.length > 0) {
                $scope.item = items[0];
                setFunctionToItem();
                angular.copy($scope.item, originalItem);
                if (!$scope.item['function']) {
                    $scope.item['function'] = {
                        name : ''
                    };
                }
                if ($scope.item.groupType) {
                    $scope.item.groupType = $scope.item.groupType + "Item";
                } else {
                    $scope.item.groupType = "none";
                }
                $scope.configMode = "edit";
                $scope.srcURL = $scope.getSrcURL($scope.item.category, $scope.item.type);
                $scope.oldCategory = $scope.item.category;
                $scope.setTitle('Edit ' + $scope.item.name);
                $scope.setSubtitle([]);
            }
        } else {
            $scope.item = {};
            $scope.setTitle('Configuration');
            $scope.setSubtitle([ 'New Item' ]);
            $scope.configMode = "create";
        }

    });

    $scope.update = function() {
        putItem("Item updated.");
    }
    $scope.create = function(item) {
        putItem("Item created.");
    }

    function putItem(text) {
        if ($scope.item.type !== "GroupItem" || $scope.item.groupType == "none") {
            $scope.item['function'] = null;
        } else {
            if ($scope.item.groupType) {
                $scope.item.groupType = $scope.item.groupType.replace("Item", "");
            }
            setItemToFunction();
        }
        if (JSON.stringify($scope.item) !== JSON.stringify(originalItem)) {
            itemService.create({
                itemName : $scope.item.name
            }, $scope.item).$promise.then(function() {
                toastService.showDefaultToast(text);
                itemRepository.setDirty(true);
                $location.path('configuration/items');
            }, function(failed) {
                $location.path('configuration/items');
            });
        } else {
            toastService.showDefaultToast(text);
            $location.path('configuration/items');
        }
    }

    function setItemToFunction() {
        if ($scope.item['function'].name.indexOf("none") == -1) {
            var splitValue = $scope.item['function'].name.split('_');
            $scope.item['function'].name = splitValue[0];
            if (splitValue.length > 1) {
                $scope.item['function'].params = [ splitValue[1], splitValue[2] ];
            }

        }
        if (!$scope.item['function'].name) {
            $scope.item['function'] = null;
        }
    }

    function setFunctionToItem() {
        if ($scope.item['function'] && $scope.item['function'].name && $scope.item['function'].params) {
            $scope.item['function'].name += "_" + $scope.item['function'].params[0] + "_" + $scope.item['function'].params[1];
        }
    }

    $scope.renderIcon = function() {
        $scope.oldCategory = $scope.item.category;
        $scope.srcURL = $scope.getSrcURL($scope.item.category, $scope.item.type);
    }

    $scope.searchItem = function(searchText, onlyGroups) {
        var criterion = {
            name : searchText
        };
        if (onlyGroups) {
            criterion.type = "GroupItem";
        }
        var items = $filter('filter')($scope.items, criterion);
        items = $filter('orderBy')(items, 'name');
        if (items.indexOf($scope.item.name) != -1) {
            items.splice(items.indexOf($scope.item.name), 1);
        }
        return items.map(function(item) {
            return item.name;
        });
    }

    $scope.openItem = function() {
        $location.path('configuration/item/edit/' + $scope.selectedItem);
    }

    $scope.setParentItem = function($chip) {
        if ($chip) {
            $scope.selectedParent = $chip;
        } else {
            $scope.selectedParent = null;
        }
    }
    $scope.setMemberItem = function($chip) {
        if ($chip) {
            $scope.selectedMember = $chip;
        } else {
            $scope.selectedMember = null;
        }
    }

    $scope.boxClicked = function() {
        $scope.selectedItem = null;
    }

    $scope.$watch('item.groupType', function() {
        if (!$scope.item) {
            return;
        }
        if ($scope.item.groupType === 'NumberItem' || $scope.item.groupType === 'DimmerItem') {
            $scope.functions = itemConfig.arithmeticFunctions;
        } else {
            $scope.functions = itemConfig.logicalFunctions;
        }
    });

    $scope.resetFunction = function() {
        if ($scope.item.groupType != originalItem.groupType) {
            $scope.item['function'].name = "";
        }
    }

}).controller('ItemRemoveController', function($scope, $mdDialog, $filter, $location, toastService, itemService, itemRepository, item) {
    $scope.item = item;
    $scope.remove = function(itemName) {
        itemService.remove({
            itemName : itemName
        }, function() {
            itemRepository.setDirty(true);
            toastService.showDefaultToast('Item removed.');
        });
        $mdDialog.hide();
    }

    $scope.close = function() {
        $mdDialog.cancel();
    }
}).directive('itemname', function() {
    return {
        restrict : 'A',
        require : 'ngModel',
        link : function(scope, element, attr, ctrl) {
            function customValidator(ngModelValue) {

                var items = getItems();
                if (!searchItemNameExists(ngModelValue, items)) {
                    ctrl.$setValidity('nameValidator', true);
                    if (ngModelValue != null && ngModelValue.length != 0) {
                        element.parent().removeClass('md-input-invalid');
                    }
                } else {
                    ctrl.$setValidity('nameValidator', false);
                    element.parent().addClass('md-input-invalid');
                }
                return ngModelValue;
            }
            function searchItemNameExists(value, arr) {
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].name == value) {
                        return true;
                    }
                }
                return false;
            }
            function getItems() {
                return scope.items;
            }
            ctrl.$parsers.push(customValidator);
        }
    };
}).directive('mdChips', function() {
    return {
        restrict : 'E',
        require : 'mdChips',
        link : function(scope, element, attributes, ctrl) {
            setTimeout(deferListeners, 500);
            function deferListeners() {
                var chipContents = element[0].getElementsByClassName('md-chip-content');
                for (var i = 0; i < chipContents.length; i++) {
                    chipContents[i].addEventListener("blur", function() {
                        ctrl.$scope.$apply();
                    });
                }
            }
            scope.createChip = function(chip) {
                setTimeout(deferListeners, 500);
                function deferListeners() {
                    var chipContents = document.getElementsByClassName('md-chip-content');
                    for (var i = 0; i < chipContents.length; i++) {
                        chipContents[i].addEventListener("blur", addChipBlurEvent);
                    }
                }
            }
            function addChipBlurEvent() {
                scope.$apply();
                setTimeout(function() {
                    // scope.selectedItem = null;
                    scope.$apply();
                }, 300);
            }
            scope.removeChip = function(chipIndex) {
                var chipContents = document.getElementsByClassName('md-chip-content');
                if (chipContents.length > chipIndex) {
                    chipContents[chipIndex].removeEventListener("blur", addChipBlurEvent);
                }
            }
        }
    }
});