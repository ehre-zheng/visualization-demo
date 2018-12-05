var wind_maxMag = 0;
var wind_minMag = Infinity;

// 风向数据
var windData = gfs025;
// https://github.com/Esri/wind-js/blob/master/windy.js#L41
var createWindBuilder = function(uComp, vComp) {
    var uData = uComp.data,
        vData = vComp.data;
    return {
        header: uComp.header,
        //recipe: recipeFor("wind-" + uComp.header.surface1Value),
        data: function(i) {
            return [uData[i], vData[i]];
        }
    }
};

var createBuilder = function(data) {
    var uComp = null,
        vComp = null,
        scalar = null;

    data.forEach(function(record) {
        switch (record.header.parameterCategory + "," + record.header.parameterNumber) {
            case "2,2":
                uComp = record;
                break;
            case "2,3":
                vComp = record;
                break;
            default:
                scalar = record;
        }
    });

    return createWindBuilder(uComp, vComp);
};

var buildGrid = function(data, callback) {
    var builder = createBuilder(data);

    var header = builder.header;
    var λ0 = header.lo1,
        φ0 = header.la1; // the grid's origin (e.g., 0.0E, 90.0N)
    var Δλ = header.dx,
        Δφ = header.dy; // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)
    var ni = header.nx,
        nj = header.ny; // number of grid points W-E and N-S (e.g., 144 x 73)
    var date = new Date(header.refTime);
    date.setHours(date.getHours() + header.forecastTime);

    // Scan mode 0 assumed. Longitude increases from λ0, and latitude decreases from φ0.
    // http://www.nco.ncep.noaa.gov/pmb/docs/grib2_doc/grib2_table3-4.shtml
    var grid = [],
        p = 0;
    var isContinuous = Math.floor(ni * Δλ) >= 360;
    for (var j = 0; j < nj; j++) {
        var row = [];
        for (var i = 0; i < ni; i++, p++) {
            row[i] = builder.data(p);
        }
        if (isContinuous) {
            // For wrapped grids, duplicate first column as last column to simplify interpolation logic
            row.push(row[0]);
        }
        grid[j] = row;
    }
   // console.log("grid",grid)
    callback(header, grid);
};

// 处理风向数据
buildGrid(windData, function(header, grid) {
        var data = [];
        var p = 0;
        var maxMag = 0;
        var minMag = Infinity;
        for (var j = 0; j < header.ny; j++) {
            for (var i = 0; i < header.nx; i++) {
                var vx = grid[j][i][0];
                var vy = grid[j][i][1];
                var mag = Math.sqrt(vx * vx + vy * vy);

                // 如果设置了局部范围
                  var lng =(i / header.nx) * (header.lo2-header.lo1+1) + header.lo1;
                    if (lng >= 180) {
                        lng = 180 - lng;
                    }
                 var lat = (j / header.ny )*(header.la2-header.la1) + header.la1

                // 数据是一个一维数组
                // [ [经度, 维度，向量经度方向的值，向量维度方向的值] ]
                data.push([
                    lng,
                    lat,
                    vx,
                    vy,
                    mag
                ]);
                maxMag = Math.max(mag, maxMag);
                minMag = Math.min(mag, minMag);
                wind_maxMag = Math.max(mag, wind_maxMag);
                wind_minMag = Math.min(mag, wind_minMag);
            }
        }

        windData = data
      //  console.log("data",data)
       
});


// 处理气象数据数据
  var VOCs_ppm_maxMag = 0;
  var VOCs_ppm_minMag = Infinity;
  var points = [].concat.apply([], weatherData.map(function (track) {
          VOCs_ppm_maxMag = Math.max(track.VOCs_ppm, VOCs_ppm_maxMag);
          VOCs_ppm_minMag = Math.min(track.VOCs_ppm, VOCs_ppm_minMag);
            return {name:"VOCs_ppm",value:[track.Longitude,track.Latitude,track.VOCs_ppm]}
    }));