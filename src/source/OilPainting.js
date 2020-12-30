/*	Copyright (c) 2019 Jean-Marc VIGLINO,
  released under the CeCILL-B license (French BSD license)
  (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
import ol_source_Raster from 'ol/source/Raster'

import {ol_ext_inherits} from '../util/ext'

/** Abstract base class; normally only used for creating subclasses. Bin collector for data
 * @constructor
 * @extends {ol.source.Vector}
 * @param {Object} options
 *  @package {Array<ol/source/Source|ol/layer/Layer>} sources Input sources or layers. For vector data, use an VectorImage layer.
 */
var ol_source_OilPainting = function (options) {
  options.operation = this._operation;
  options.operationType = 'image';

  ol_source_Raster.call(this, options);

  this.set('radius', options.radius || 4);
  this.set('intensity', options.intensity || 25);

  this.on('beforeoperations', function (event) {
    var w = Math.round((event.extent[2]-event.extent[0])/event.resolution);
    var h = Math.round((event.extent[3]-event.extent[1])/event.resolution);
    event.data.image = new ImageData(w,h);
    event.data.radius = Number(this.get('radius')) || 1;
    event.data.intensity = Number(this.get('intensity'));
  }.bind(this));
};
ol_ext_inherits(ol_source_OilPainting, ol_source_Raster);

/** Set value and force change
 */
ol_source_OilPainting.prototype.set = function(key, val) {
  if (val) {
    switch (key) {
      case 'intensity': 
      case 'radius': {
        val = Number(val);
        if (val<1) val = 1;
        this.changed();
        break;
      }
    }
  }
  return ol_source_Raster.prototype.set.call(this, key, val);
};

/**
 * @private
 */
ol_source_OilPainting.prototype._operation = function(pixels, data) {

  var width = pixels[0].width,
    height = pixels[0].height,
    imgData = pixels[0],
    pixData = imgData.data,
    pixelIntensityCount = [];

  var destImageData = data.image,
    destPixData = destImageData.data,
    intensityLUT = [],
    rgbLUT = [];

  for (var y = 0; y < height; y++) {
    intensityLUT[y] = [];
    rgbLUT[y] = [];
    for (var x = 0; x < width; x++) {
      var idx = (y * width + x) * 4,
        r = pixData[idx],
        g = pixData[idx + 1],
        b = pixData[idx + 2],
        avg = (r + g + b) / 3;
      
      intensityLUT[y][x] = Math.round((avg * data.intensity) / 255);
      rgbLUT[y][x] = {
        r: r,
        g: g,
        b: b
      };
    }
  }

  var radius = data.radius;
  for (y = 0; y < height; y++) {
    for (x = 0; x < width; x++) {
      pixelIntensityCount = [];
      
      // Find intensities of nearest pixels within radius.
      for (var yy = -radius; yy <= radius; yy++) {
        for (var xx = -radius; xx <= radius; xx++) {
          if (y + yy > 0 && y + yy < height && x + xx > 0 && x + xx < width) {
            var intensityVal = intensityLUT[y + yy][x + xx];

            if (!pixelIntensityCount[intensityVal]) {
              pixelIntensityCount[intensityVal] = {
                val: 1,
                r: rgbLUT[y + yy][x + xx].r,
                g: rgbLUT[y + yy][x + xx].g,
                b: rgbLUT[y + yy][x + xx].b
              }
            } else {
              pixelIntensityCount[intensityVal].val++;
              pixelIntensityCount[intensityVal].r += rgbLUT[y + yy][x + xx].r;
              pixelIntensityCount[intensityVal].g += rgbLUT[y + yy][x + xx].g;
              pixelIntensityCount[intensityVal].b += rgbLUT[y + yy][x + xx].b;
            }
          }
        }
      }
      
      pixelIntensityCount.sort(function (a, b) {
        return b.val - a.val;
      });
      
      var curMax = pixelIntensityCount[0].val,
        dIdx = (y * width + x) * 4;
      
      destPixData[dIdx] = ~~ (pixelIntensityCount[0].r / curMax);
      destPixData[dIdx + 1] = ~~ (pixelIntensityCount[0].g / curMax);
      destPixData[dIdx + 2] = ~~ (pixelIntensityCount[0].b / curMax);
      destPixData[dIdx + 3] = 255;
    }
  }
  return destImageData;
};

export default ol_source_OilPainting
