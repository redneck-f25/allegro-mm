/// <reference path="../../typings/tsd.d.ts" />
"use strict";
( function() {
    var link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = './favicon.ico';
    document.head.appendChild(link);
});

angular.module("mmWeb.home", ["ui.router"]);
angular.module("mmWeb.home").config(function ($stateProvider) {
    $stateProvider.state("dashboard", {
        url: "",
        parent: "common",
        templateUrl: "modules/home/home.html",
        controller: HomeCtrl
    });
});
angular.module("mmWeb.home").controller("HomeCtrl", HomeCtrl);
HomeCtrl.$inject = ["$scope", "$http", "$log"];
function HomeCtrl($scope, $http, $log) {
    $scope.flotLineChartOptions = {
        xaxis: {
            mode: "time",
            show: true
        },
        crosshair: {
            mode: "x"
        },
        grid: {
            hoverable: true
        },
        lines: {
            show: true,
            fill: true
        },
        tooltip: {
            show: true,
            content: "%s: %y Mbps",
            line: true
        }
    };
    $scope.stats = null;
    $scope.lastStats = null;
    $scope.topProtocolList = [];
    $scope.topIPList = [];
    $scope.flotGraphData = [{ label: "sent", data: [] },
        { label: "received", data: [] }];
    $scope.flotPieChartOptions = {
        series: {
            pie: {
                show: true,
                radius: 1,
                label: {
                    show: false,
                    radius: 3 / 4
                }
            }
        },
        legend: {
            show: false
        },
        grid: {
            hoverable: false
        },
        tooltip: {
            show: false
        }
    };
    $scope.updateStats = function () {
        var page_param = {};
        $scope.updater.fillTimeParams(page_param);
        page_param["values"] = 30;
        $http.get("API/stats/interfaces?" + $.param(page_param)).then(function (response) {
            // enhance data with old data if available
            var now = response.data.timestampNs / 1000000.0;
            $scope.stats = response.data;
            $scope.stats.timestampMs = now;
            if ($scope.lastStats == null) {
                $scope.lastStats = $scope.stats;
                return;
            }
            var timeElapsed = (response.data.timestampMs - $scope.lastStats.timestampMs) / 1000.0;
            if (timeElapsed == 0) {
                return;
            }
            var different_ts = false;
            if (response.data.interfaces.length > 0) {
                var first_ts = response.data.interfaces[0].history.data[0];
                for (var i = 1; i < response.data.interfaces.length; i++) {
                    if (first_ts != response.data.interfaces[i].history.data[0]) {
                        different_ts = true;
                        break;
                    }
                }
            }
            if (different_ts == false) {
                $scope.totalHistory = { rows: [],
                    data: [],
                    newestTimeStamp: 0 };
                if (response.data.interfaces.length > 0) {
                    var rows = response.data.interfaces[0].history.rows.length;
                    response.data.interfaces[0].history.rows.forEach(function (row) {
                        $scope.totalHistory.rows.push(angular.copy(row));
                    });
                    response.data.interfaces[0].history.data.forEach(function (data) {
                        $scope.totalHistory.data.push(data);
                    });
                    // add all other interfaces
                    for (var i = 1; i < response.data.interfaces.length; i++) {
                        for (var j = 0; j < response.data.interfaces[i].history.data.length; j++) {
                            if ((j % (rows + 1)) == 0) {
                                // skip timestamp
                                continue;
                            }
                            $scope.totalHistory.data[j] += response.data.interfaces[i].history.data[j];
                        }
                    }
                    $scope.totalHistory.newestTimeStamp = response.data.interfaces[0].history.newestTimeStamp;
                    $scope.intfTableColWidth = Math.floor(100 / (response.data.interfaces.length + 2));
                }
            }
            $scope.lastStats = $scope.stats;
        });
        page_param = {};
        $scope.updater.fillTimeParams(page_param);
        page_param["history"] = false;
        page_param["sort"] = "ppm";
        page_param["count"] = 5;
        $http.get("API/stats/modules/dpi/top?" + $.param(page_param)).then(function (response) {
            $scope.topProtocolList = response.data.protocols;
            $scope.topApplicationList = response.data.applications;
        });
        // page_param["sort"] = "packets";
        page_param["sort"] = "ppm";
        page_param["reverse"] = true;
        page_param["count"] = 5;
        $http.get("API/stats/modules/ip/ips_paged?" + $.param(page_param)).then(function (response) {
            $scope.topIPList = response.data.displayedItems;
            $scope.topIPList.forEach(function (elem) {
                if (angular.isDefined(elem.dhcpHostName)) {
                    elem.visibleName = elem.dhcpHostName;
                }
                else if (angular.isDefined(elem.dnsName)) {
                    elem.visibleName = elem.dnsName;
                }
                else if (angular.isDefined(elem.dhcpHostNameFromMAC)) {
                    elem.visibleName = elem.dhcpHostNameFromMAC;
                }
                else if (angular.isDefined(elem.macVendor)) {
                    elem.visibleName = elem.macVendor;
                }
            });
        });
        // page_param["sort"] = "packets";
        page_param["sort"] = "ppm";
        page_param["reverse"] = true;
        page_param["count"] = 5;
        $http.get("API/stats/modules/mac/mac_paged?" + $.param(page_param)).then(function (response) {
            $scope.topMacList = response.data.displayedItems;
        });
        // tcp stats
        var param = {};
        param["detail"] = "full";
        $http.get("API/stats/modules/ip?" + $.param(param)).then(function (response) {
            $scope.tcpStats = response.data.tcpStats;
            var graphData = [{
                    label: "Green",
                    data: $scope.tcpStats.scoreSynDetails.local.greenScores + $scope.tcpStats.scoreSynDetails.global.greenScores + $scope.tcpStats.scoreSynAckDetails.local.greenScores + $scope.tcpStats.scoreSynAckDetails.global.greenScores,
                    color: "green"
                }, {
                    label: "Yellow",
                    data: $scope.tcpStats.scoreSynDetails.local.yellowScores + $scope.tcpStats.scoreSynDetails.global.yellowScores + $scope.tcpStats.scoreSynAckDetails.local.yellowScores + $scope.tcpStats.scoreSynAckDetails.global.yellowScores,
                    color: "orange"
                }, {
                    label: "Red",
                    data: $scope.tcpStats.scoreSynDetails.local.redScores + $scope.tcpStats.scoreSynDetails.global.redScores + $scope.tcpStats.scoreSynAckDetails.local.yellowScores + $scope.tcpStats.scoreSynAckDetails.global.yellowScores,
                    color: "red"
                }];
            $.plot($("#tcpChart"), graphData, $scope.flotPieChartOptions);
        });
        // http stats
        param["detail"] = "full";
        $http.get("API/stats/modules/http?" + $.param(param)).then(function (response) {
            $scope.httpStats = response.data;
            var graphData = [{
                    label: "Green",
                    data: $scope.httpStats.scoreDetails.local.greenScores + $scope.httpStats.scoreDetails.global.greenScores,
                    color: "green"
                }, {
                    label: "Yellow",
                    data: $scope.httpStats.scoreDetails.local.yellowScores + $scope.httpStats.scoreDetails.global.yellowScores,
                    color: "orange"
                }, {
                    label: "Red",
                    data: $scope.httpStats.scoreDetails.local.redScores + $scope.httpStats.scoreDetails.global.redScores,
                    color: "red"
                }];
            $.plot($("#httpChart"), graphData, $scope.flotPieChartOptions);
        });
        // ssl stats
        param["detail"] = "full";
        $http.get("API/stats/modules/ssl?" + $.param(param)).then(function (response) {
            $scope.sslStats = response.data;
            var graphHelloData = [{
                    label: "Green",
                    data: $scope.sslStats.scoreDetails.localServers.helloGreenScores + $scope.sslStats.scoreDetails.globalServers.helloGreenScores,
                    color: "green"
                }, {
                    label: "Yellow",
                    data: $scope.sslStats.scoreDetails.localServers.helloYellowScores + $scope.sslStats.scoreDetails.globalServers.helloYellowScores,
                    color: "orange"
                }, {
                    label: "Red",
                    data: $scope.sslStats.scoreDetails.localServers.helloRedScores + $scope.sslStats.scoreDetails.globalServers.helloRedScores,
                    color: "red"
                }];
            $.plot($("#sslHelloChart"), graphHelloData, $scope.flotPieChartOptions);
            var graphDataData = [{
                    label: "Green",
                    data: $scope.sslStats.scoreDetails.localServers.dataGreenScores + $scope.sslStats.scoreDetails.globalServers.dataGreenScores,
                    color: "green"
                }, {
                    label: "Yellow",
                    data: $scope.sslStats.scoreDetails.localServers.dataYellowScores + $scope.sslStats.scoreDetails.globalServers.dataYellowScores,
                    color: "orange"
                }, {
                    label: "Red",
                    data: $scope.sslStats.scoreDetails.localServers.dataRedScores + $scope.sslStats.scoreDetails.globalServers.dataRedScores,
                    color: "red"
                }];
            $.plot($("#sslDataChart"), graphDataData, $scope.flotPieChartOptions);
        });
    };
    $scope.updateStats();
    $scope.$on("updateStats", $scope.updateStats);
    $scope.$on("updateZoom", $scope.updateStats);
}
//# sourceMappingURL=home.js.map
