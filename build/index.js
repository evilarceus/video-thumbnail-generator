'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fluentFfmpeg = require('fluent-ffmpeg');

var _fluentFfmpeg2 = _interopRequireDefault(_fluentFfmpeg);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _del = require('del');

var _del2 = _interopRequireDefault(_del);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class ThumbnailGenerator
 */
var ThumbnailGenerator = function () {

  /**
   * @constructor
   *
   * @param {String} [opts.sourcePath] - 'full path to video file'
   * @param {String} [opts.thumbnailPath] - 'path to where thumbnail(s) should be saved'
   * @param {Number} [opts.percent]
   * @param {String} [opts.size]
   * @param {Logger} [opts.logger]
   */
  function ThumbnailGenerator(opts) {
    _classCallCheck(this, ThumbnailGenerator);

    this.sourcePath = opts.sourcePath;
    this.thumbnailPath = opts.thumbnailPath;
    this.percent = opts.percent + '%' || '90%';
    this.logger = opts.logger || null;
    this.size = opts.size || '320x240';
    this.fileNameFormat = opts.fileNameFormat || '%b-thumbnail-%r-%000i';
    this.tmpDir = opts.tmpDir || '/tmp';

    // by include deps here, it is easier to mock them out
    this.FfmpegCommand = _fluentFfmpeg2.default;
    this.del = _del2.default;
  }

  /**
   * @method getFfmpegInstance
   *
   * @return {FfmpegCommand}
   *
   * @private
   */


  _createClass(ThumbnailGenerator, [{
    key: 'getFfmpegInstance',
    value: function getFfmpegInstance() {
      return new this.FfmpegCommand({
        source: this.sourcePath,
        logger: this.logger
      });
    }

    /**
     * Method to generate one thumbnail by being given a percentage value.
     *
     * @method generateOneByPercent
     *
     * @param {Number} percent
     * @param {String} [opts.folder]
     * @param {String} [opts.size] - 'i.e. 320x320'
     * @param {String} [opts.filename]
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generateOneByPercent',
    value: function generateOneByPercent(percent, opts) {
      if (percent < 0 || percent > 100) {
        return _bluebird2.default.reject(new Error('Percent must be a value from 0-100'));
      }

      return this.generate(_lodash2.default.assignIn(opts, {
        count: 1,
        timestamps: [percent + '%']
      })).then(function (result) {
        return result.pop();
      });
    }

    /**
     * Method to generate one thumbnail by being given a percentage value.
     *
     * @method generateOneByPercentCb
     *
     * @param {Number} percent
     * @param {Object} [opts]
     * @param {Function} cb (err, string)
     *
     * @return {Void}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generateOneByPercentCb',
    value: function generateOneByPercentCb(percent, opts, cb) {
      var callback = cb || opts;

      this.generateOneByPercent(percent, opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }

    /**
     * Method to generate thumbnails
     *
     * @method generate
     *
     * @param {String} [opts.folder]
     * @param {Number} [opts.count]
     * @param {String} [opts.size] - 'i.e. 320x320'
     * @param {String} [opts.filename]
     *
     * @return {Promise}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generate',
    value: function generate(opts) {
      var defaultSettings = {
        folder: this.thumbnailPath,
        count: 10,
        size: this.size,
        filename: this.fileNameFormat,
        logger: this.logger
      };

      var ffmpeg = this.getFfmpegInstance();
      var settings = _lodash2.default.assignIn(defaultSettings, opts);
      var filenameArray = [];

      return new _bluebird2.default(function (resolve, reject) {
        function complete() {
          resolve(filenameArray);
        }

        function filenames(fns) {
          filenameArray = fns;
        }

        ffmpeg.on('filenames', filenames).on('end', complete).on('error', reject).screenshots(settings);
      });
    }

    /**
     * Method to generate thumbnails
     *
     * @method generateCb
     *
     * @param {String} [opts.folder]
     * @param {Number} [opts.count]
     * @param {String} [opts.size] - 'i.e. 320x320'
     * @param {String} [opts.filename]
     * @param {Function} cb - (err, array)
     *
     * @return {Void}
     *
     * @public
     *
     * @async
     */

  }, {
    key: 'generateCb',
    value: function generateCb(opts, cb) {
      var callback = cb || opts;

      this.generate(opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }

    /**
     * Method to generate the palette from a video (required for creating gifs)
     *
     * @method generatePalette
     *
     * @param {string} [opts.videoFilters]
     * @param {string} [opts.offset]
     * @param {string} [opts.duration]
     * @param {string} [opts.videoFilters]
     *
     * @return {Promise}
     *
     * @public
     */

  }, {
    key: 'generatePalette',
    value: function generatePalette(opts) {
      var ffmpeg = this.getFfmpegInstance();
      var defaultOpts = {
        videoFilters: 'fps=10,scale=320:-1:flags=lanczos,palettegen'
      };
      var conf = _lodash2.default.assignIn(defaultOpts, opts);
      var inputOptions = ['-y'];
      var outputOptions = ['-vf ' + conf.videoFilters];
      var output = this.tmpDir + '/palette-' + Date.now() + '.png';

      return new _bluebird2.default(function (resolve, reject) {
        function complete() {
          resolve(output);
        }

        if (conf.offset) {
          inputOptions.push('-ss ' + conf.offset);
        }

        if (conf.duration) {
          inputOptions.push('-t ' + conf.duration);
        }

        ffmpeg.inputOptions(inputOptions).outputOptions(outputOptions).on('end', complete).on('error', reject).output(output).run();
      });
    }
    /**
     * Method to generate the palette from a video (required for creating gifs)
     *
     * @method generatePaletteCb
     *
     * @param {string} [opts.videoFilters]
     * @param {string} [opts.offset]
     * @param {string} [opts.duration]
     * @param {string} [opts.videoFilters]
     * @param {Function} cb - (err, array)
     *
     * @return {Promise}
     *
     * @public
     */

  }, {
    key: 'generatePaletteCb',
    value: function generatePaletteCb(opts, cb) {
      var callback = cb || opts;

      this.generatePalette(opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }

    /**
     * Method to create a short gif thumbnail from an mp4 video
     *
     * @method generateGif
     *
     * @param {Number} opts.fps
     * @param {Number} opts.scale
     * @param {Number} opts.speedMultiple
     * @param {Boolean} opts.deletePalette
     *
     * @return {Promise}
     *
     * @public
     */

  }, {
    key: 'generateGif',
    value: function generateGif(opts) {
      var ffmpeg = this.getFfmpegInstance();
      var defaultOpts = {
        fps: 0.75,
        scale: 180,
        speedMultiplier: 4,
        deletePalette: true
      };
      var conf = _lodash2.default.assignIn(defaultOpts, opts);
      var inputOptions = [];
      var outputOptions = ['-filter_complex fps=' + conf.fps + ',setpts=(1/' + conf.speedMultiplier + ')*PTS,scale=' + conf.scale + ':-1:flags=lanczos[x];[x][1:v]paletteuse'];
      var outputFileName = conf.fileName || 'video-' + Date.now() + '.gif';
      var output = this.thumbnailPath + '/' + outputFileName;
      var d = this.del;

      function createGif(paletteFilePath) {
        if (conf.offset) {
          inputOptions.push('-ss ' + conf.offset);
        }

        if (conf.duration) {
          inputOptions.push('-t ' + conf.duration);
        }

        return new _bluebird2.default(function (resolve, reject) {
          outputOptions.unshift('-i ' + paletteFilePath);

          function complete() {
            if (conf.deletePalette === true) {
              d.sync([paletteFilePath], {
                force: true
              });
            }
            resolve(output);
          }

          ffmpeg.inputOptions(inputOptions).outputOptions(outputOptions).on('end', complete).on('error', reject).output(output).run();
        });
      }

      return this.generatePalette().then(createGif);
    }

    /**
     * Method to create a short gif thumbnail from an mp4 video
     *
     * @method generateGifCb
     *
     * @param {Number} opts.fps
     * @param {Number} opts.scale
     * @param {Number} opts.speedMultiple
     * @param {Boolean} opts.deletePalette
     * @param {Function} cb - (err, array)
     *
     * @public
     */

  }, {
    key: 'generateGifCb',
    value: function generateGifCb(opts, cb) {
      var callback = cb || opts;

      this.generateGif(opts).then(function (result) {
        return callback(null, result);
      }).catch(callback);
    }
  }]);

  return ThumbnailGenerator;
}();

exports.default = ThumbnailGenerator;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbIlRodW1ibmFpbEdlbmVyYXRvciIsIm9wdHMiLCJzb3VyY2VQYXRoIiwidGh1bWJuYWlsUGF0aCIsInBlcmNlbnQiLCJsb2dnZXIiLCJzaXplIiwiZmlsZU5hbWVGb3JtYXQiLCJ0bXBEaXIiLCJGZm1wZWdDb21tYW5kIiwiZGVsIiwic291cmNlIiwiUHJvbWlzZSIsInJlamVjdCIsIkVycm9yIiwiZ2VuZXJhdGUiLCJfIiwiYXNzaWduSW4iLCJjb3VudCIsInRpbWVzdGFtcHMiLCJ0aGVuIiwicmVzdWx0IiwicG9wIiwiY2IiLCJjYWxsYmFjayIsImdlbmVyYXRlT25lQnlQZXJjZW50IiwiY2F0Y2giLCJkZWZhdWx0U2V0dGluZ3MiLCJmb2xkZXIiLCJmaWxlbmFtZSIsImZmbXBlZyIsImdldEZmbXBlZ0luc3RhbmNlIiwic2V0dGluZ3MiLCJmaWxlbmFtZUFycmF5IiwicmVzb2x2ZSIsImNvbXBsZXRlIiwiZmlsZW5hbWVzIiwiZm5zIiwib24iLCJzY3JlZW5zaG90cyIsImRlZmF1bHRPcHRzIiwidmlkZW9GaWx0ZXJzIiwiY29uZiIsImlucHV0T3B0aW9ucyIsIm91dHB1dE9wdGlvbnMiLCJvdXRwdXQiLCJEYXRlIiwibm93Iiwib2Zmc2V0IiwicHVzaCIsImR1cmF0aW9uIiwicnVuIiwiZ2VuZXJhdGVQYWxldHRlIiwiZnBzIiwic2NhbGUiLCJzcGVlZE11bHRpcGxpZXIiLCJkZWxldGVQYWxldHRlIiwib3V0cHV0RmlsZU5hbWUiLCJmaWxlTmFtZSIsImQiLCJjcmVhdGVHaWYiLCJwYWxldHRlRmlsZVBhdGgiLCJ1bnNoaWZ0Iiwic3luYyIsImZvcmNlIiwiZ2VuZXJhdGVHaWYiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUE7OztJQUdxQkEsa0I7O0FBRW5COzs7Ozs7Ozs7QUFTQSw4QkFBWUMsSUFBWixFQUFrQjtBQUFBOztBQUNoQixTQUFLQyxV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aUM7QUFDL0JHLGdCQUFFSSxJQUFGLENBQU8sQ0FBQ0YsZUFBRCxDQUFQLEVBQTBCO0FBQ3hCRyx1QkFBTztBQURpQixlQUExQjtBQUdEO0FBQ0Q5QixvQkFBUVcsTUFBUjtBQUNEOztBQUVEZixpQkFDR2EsWUFESCxDQUNnQkEsWUFEaEIsRUFFR0MsYUFGSCxDQUVpQkEsYUFGakIsRUFHR04sRUFISCxDQUdNLEtBSE4sRUFHYUgsUUFIYixFQUlHRyxFQUpILENBSU0sT0FKTixFQUllekIsTUFKZixFQUtHZ0MsTUFMSCxDQUtVQSxNQUxWLEVBTUdNLEdBTkg7QUFPRCxTQW5CTSxDQUFQO0FBb0JEOztBQUVELGFBQU8sS0FBS0MsZUFBTCxHQUNKaEMsSUFESSxDQUNDd0MsU0FERCxDQUFQO0FBRUQ7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7a0NBYWMzRCxJLEVBQU1zQixFLEVBQUk7QUFDdEIsVUFBTUMsV0FBV0QsTUFBTXRCLElBQXZCOztBQUVBLFdBQUtnRSxXQUFMLENBQWlCaEUsSUFBakIsRUFDR21CLElBREgsQ0FDUTtBQUFBLGVBQVVJLFNBQVMsSUFBVCxFQUFlSCxNQUFmLENBQVY7QUFBQSxPQURSLEVBRUdLLEtBRkgsQ0FFU0YsUUFGVDtBQUdEOzs7Ozs7a0JBN1RrQnhCLGtCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IEZmbXBlZ0NvbW1hbmQgZnJvbSAnZmx1ZW50LWZmbXBlZyc7XG5pbXBvcnQgUHJvbWlzZSBmcm9tICdibHVlYmlyZCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGRlbCBmcm9tICdkZWwnO1xuXG4vKipcbiAqIEBjbGFzcyBUaHVtYm5haWxHZW5lcmF0b3JcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGh1bWJuYWlsR2VuZXJhdG9yIHtcblxuICAvKipcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zb3VyY2VQYXRoXSAtICdmdWxsIHBhdGggdG8gdmlkZW8gZmlsZSdcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLnRodW1ibmFpbFBhdGhdIC0gJ3BhdGggdG8gd2hlcmUgdGh1bWJuYWlsKHMpIHNob3VsZCBiZSBzYXZlZCdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRzLnBlcmNlbnRdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zaXplXVxuICAgKiBAcGFyYW0ge0xvZ2dlcn0gW29wdHMubG9nZ2VyXVxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMuc291cmNlUGF0aCA9IG9wdHMuc291cmNlUGF0aDtcbiAgICB0aGlzLnRodW1ibmFpbFBhdGggPSBvcHRzLnRodW1ibmFpbFBhdGg7XG4gICAgdGhpcy5wZXJjZW50ID0gYCR7b3B0cy5wZXJjZW50fSVgIHx8ICc5MCUnO1xuICAgIHRoaXMubG9nZ2VyID0gb3B0cy5sb2dnZXIgfHwgbnVsbDtcbiAgICB0aGlzLnNpemUgPSBvcHRzLnNpemUgfHwgJzMyMHgyNDAnO1xuICAgIHRoaXMuZmlsZU5hbWVGb3JtYXQgPSBvcHRzLmZpbGVOYW1lRm9ybWF0IHx8ICclYi10aHVtYm5haWwtJXItJTAwMGknO1xuICAgIHRoaXMudG1wRGlyID0gb3B0cy50bXBEaXIgfHwgJy90bXAnO1xuXG4gICAgLy8gYnkgaW5jbHVkZSBkZXBzIGhlcmUsIGl0IGlzIGVhc2llciB0byBtb2NrIHRoZW0gb3V0XG4gICAgdGhpcy5GZm1wZWdDb21tYW5kID0gRmZtcGVnQ29tbWFuZDtcbiAgICB0aGlzLmRlbCA9IGRlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGdldEZmbXBlZ0luc3RhbmNlXG4gICAqXG4gICAqIEByZXR1cm4ge0ZmbXBlZ0NvbW1hbmR9XG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRGZm1wZWdJbnN0YW5jZSgpIHtcbiAgICByZXR1cm4gbmV3IHRoaXMuRmZtcGVnQ29tbWFuZCh7XG4gICAgICBzb3VyY2U6IHRoaXMuc291cmNlUGF0aCxcbiAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIG9uZSB0aHVtYm5haWwgYnkgYmVpbmcgZ2l2ZW4gYSBwZXJjZW50YWdlIHZhbHVlLlxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlT25lQnlQZXJjZW50XG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBwZXJjZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5mb2xkZXJdXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5zaXplXSAtICdpLmUuIDMyMHgzMjAnXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0cy5maWxlbmFtZV1cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICpcbiAgICogQHB1YmxpY1xuICAgKlxuICAgKiBAYXN5bmNcbiAgICovXG4gIGdlbmVyYXRlT25lQnlQZXJjZW50KHBlcmNlbnQsIG9wdHMpIHtcbiAgICBpZiAocGVyY2VudCA8IDAgfHwgcGVyY2VudCA+IDEwMCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignUGVyY2VudCBtdXN0IGJlIGEgdmFsdWUgZnJvbSAwLTEwMCcpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZShfLmFzc2lnbkluKG9wdHMsIHtcbiAgICAgIGNvdW50OiAxLFxuICAgICAgdGltZXN0YW1wczogW2Ake3BlcmNlbnR9JWBdLFxuICAgIH0pKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHJlc3VsdC5wb3AoKSk7XG4gIH1cblxuICAvKipcbiAgICogTWV0aG9kIHRvIGdlbmVyYXRlIG9uZSB0aHVtYm5haWwgYnkgYmVpbmcgZ2l2ZW4gYSBwZXJjZW50YWdlIHZhbHVlLlxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlT25lQnlQZXJjZW50Q2JcbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IHBlcmNlbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAoZXJyLCBzdHJpbmcpXG4gICAqXG4gICAqIEByZXR1cm4ge1ZvaWR9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICpcbiAgICogQGFzeW5jXG4gICAqL1xuICBnZW5lcmF0ZU9uZUJ5UGVyY2VudENiKHBlcmNlbnQsIG9wdHMsIGNiKSB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBjYiB8fCBvcHRzO1xuXG4gICAgdGhpcy5nZW5lcmF0ZU9uZUJ5UGVyY2VudChwZXJjZW50LCBvcHRzKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpXG4gICAgICAuY2F0Y2goY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSB0aHVtYm5haWxzXG4gICAqXG4gICAqIEBtZXRob2QgZ2VuZXJhdGVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZvbGRlcl1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRzLmNvdW50XVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuc2l6ZV0gLSAnaS5lLiAzMjB4MzIwJ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuZmlsZW5hbWVdXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICpcbiAgICogQGFzeW5jXG4gICAqL1xuICBnZW5lcmF0ZShvcHRzKSB7XG4gICAgY29uc3QgZGVmYXVsdFNldHRpbmdzID0ge1xuICAgICAgZm9sZGVyOiB0aGlzLnRodW1ibmFpbFBhdGgsXG4gICAgICBjb3VudDogMTAsXG4gICAgICBzaXplOiB0aGlzLnNpemUsXG4gICAgICBmaWxlbmFtZTogdGhpcy5maWxlTmFtZUZvcm1hdCxcbiAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgfTtcblxuICAgIGNvbnN0IGZmbXBlZyA9IHRoaXMuZ2V0RmZtcGVnSW5zdGFuY2UoKTtcbiAgICBjb25zdCBzZXR0aW5ncyA9IF8uYXNzaWduSW4oZGVmYXVsdFNldHRpbmdzLCBvcHRzKTtcbiAgICBsZXQgZmlsZW5hbWVBcnJheSA9IFtdO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICByZXNvbHZlKGZpbGVuYW1lQXJyYXkpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBmaWxlbmFtZXMoZm5zKSB7XG4gICAgICAgIGZpbGVuYW1lQXJyYXkgPSBmbnM7XG4gICAgICB9XG5cbiAgICAgIGZmbXBlZ1xuICAgICAgICAub24oJ2ZpbGVuYW1lcycsIGZpbGVuYW1lcylcbiAgICAgICAgLm9uKCdlbmQnLCBjb21wbGV0ZSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdClcbiAgICAgICAgLnNjcmVlbnNob3RzKHNldHRpbmdzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgdGh1bWJuYWlsc1xuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlQ2JcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRzLmZvbGRlcl1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRzLmNvdW50XVxuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuc2l6ZV0gLSAnaS5lLiAzMjB4MzIwJ1xuICAgKiBAcGFyYW0ge1N0cmluZ30gW29wdHMuZmlsZW5hbWVdXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gKGVyciwgYXJyYXkpXG4gICAqXG4gICAqIEByZXR1cm4ge1ZvaWR9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICpcbiAgICogQGFzeW5jXG4gICAqL1xuICBnZW5lcmF0ZUNiKG9wdHMsIGNiKSB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBjYiB8fCBvcHRzO1xuXG4gICAgdGhpcy5nZW5lcmF0ZShvcHRzKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpXG4gICAgICAuY2F0Y2goY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ldGhvZCB0byBnZW5lcmF0ZSB0aGUgcGFsZXR0ZSBmcm9tIGEgdmlkZW8gKHJlcXVpcmVkIGZvciBjcmVhdGluZyBnaWZzKVxuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlUGFsZXR0ZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMudmlkZW9GaWx0ZXJzXVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMub2Zmc2V0XVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMuZHVyYXRpb25dXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy52aWRlb0ZpbHRlcnNdXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIGdlbmVyYXRlUGFsZXR0ZShvcHRzKSB7XG4gICAgY29uc3QgZmZtcGVnID0gdGhpcy5nZXRGZm1wZWdJbnN0YW5jZSgpO1xuICAgIGNvbnN0IGRlZmF1bHRPcHRzID0ge1xuICAgICAgdmlkZW9GaWx0ZXJzOiAnZnBzPTEwLHNjYWxlPTMyMDotMTpmbGFncz1sYW5jem9zLHBhbGV0dGVnZW4nLFxuICAgIH07XG4gICAgY29uc3QgY29uZiA9IF8uYXNzaWduSW4oZGVmYXVsdE9wdHMsIG9wdHMpO1xuICAgIGNvbnN0IGlucHV0T3B0aW9ucyA9IFtcbiAgICAgICcteScsXG4gICAgXTtcbiAgICBjb25zdCBvdXRwdXRPcHRpb25zID0gW1xuICAgICAgYC12ZiAke2NvbmYudmlkZW9GaWx0ZXJzfWAsXG4gICAgXTtcbiAgICBjb25zdCBvdXRwdXQgPSBgJHt0aGlzLnRtcERpcn0vcGFsZXR0ZS0ke0RhdGUubm93KCl9LnBuZ2A7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYub2Zmc2V0KSB7XG4gICAgICAgIGlucHV0T3B0aW9ucy5wdXNoKGAtc3MgJHtjb25mLm9mZnNldH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmYuZHVyYXRpb24pIHtcbiAgICAgICAgaW5wdXRPcHRpb25zLnB1c2goYC10ICR7Y29uZi5kdXJhdGlvbn1gKTtcbiAgICAgIH1cblxuICAgICAgZmZtcGVnXG4gICAgICAgIC5pbnB1dE9wdGlvbnMoaW5wdXRPcHRpb25zKVxuICAgICAgICAub3V0cHV0T3B0aW9ucyhvdXRwdXRPcHRpb25zKVxuICAgICAgICAub24oJ2VuZCcsIGNvbXBsZXRlKVxuICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KVxuICAgICAgICAub3V0cHV0KG91dHB1dClcbiAgICAgICAgLnJ1bigpO1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBNZXRob2QgdG8gZ2VuZXJhdGUgdGhlIHBhbGV0dGUgZnJvbSBhIHZpZGVvIChyZXF1aXJlZCBmb3IgY3JlYXRpbmcgZ2lmcylcbiAgICpcbiAgICogQG1ldGhvZCBnZW5lcmF0ZVBhbGV0dGVDYlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMudmlkZW9GaWx0ZXJzXVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMub2Zmc2V0XVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdHMuZHVyYXRpb25dXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0cy52aWRlb0ZpbHRlcnNdXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gKGVyciwgYXJyYXkpXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIGdlbmVyYXRlUGFsZXR0ZUNiKG9wdHMsIGNiKSB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBjYiB8fCBvcHRzO1xuXG4gICAgdGhpcy5nZW5lcmF0ZVBhbGV0dGUob3B0cylcbiAgICAgIC50aGVuKHJlc3VsdCA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQpKVxuICAgICAgLmNhdGNoKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gY3JlYXRlIGEgc2hvcnQgZ2lmIHRodW1ibmFpbCBmcm9tIGFuIG1wNCB2aWRlb1xuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlR2lmXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmZwc1xuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5zY2FsZVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5zcGVlZE11bHRpcGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5kZWxldGVQYWxldHRlXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBwdWJsaWNcbiAgICovXG4gIGdlbmVyYXRlR2lmKG9wdHMpIHtcbiAgICBjb25zdCBmZm1wZWcgPSB0aGlzLmdldEZmbXBlZ0luc3RhbmNlKCk7XG4gICAgY29uc3QgZGVmYXVsdE9wdHMgPSB7XG4gICAgICBmcHM6IDAuNzUsXG4gICAgICBzY2FsZTogMTgwLFxuICAgICAgc3BlZWRNdWx0aXBsaWVyOiA0LFxuICAgICAgZGVsZXRlUGFsZXR0ZTogdHJ1ZSxcbiAgICB9O1xuICAgIGNvbnN0IGNvbmYgPSBfLmFzc2lnbkluKGRlZmF1bHRPcHRzLCBvcHRzKTtcbiAgICBjb25zdCBpbnB1dE9wdGlvbnMgPSBbXTtcbiAgICBjb25zdCBvdXRwdXRPcHRpb25zID0gW2AtZmlsdGVyX2NvbXBsZXggZnBzPSR7Y29uZi5mcHN9LHNldHB0cz0oMS8ke2NvbmYuc3BlZWRNdWx0aXBsaWVyfSkqUFRTLHNjYWxlPSR7Y29uZi5zY2FsZX06LTE6ZmxhZ3M9bGFuY3pvc1t4XTtbeF1bMTp2XXBhbGV0dGV1c2VgXTtcbiAgICBjb25zdCBvdXRwdXRGaWxlTmFtZSA9IGNvbmYuZmlsZU5hbWUgfHwgYHZpZGVvLSR7RGF0ZS5ub3coKX0uZ2lmYDtcbiAgICBjb25zdCBvdXRwdXQgPSBgJHt0aGlzLnRodW1ibmFpbFBhdGh9LyR7b3V0cHV0RmlsZU5hbWV9YDtcbiAgICBjb25zdCBkID0gdGhpcy5kZWw7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVHaWYocGFsZXR0ZUZpbGVQYXRoKSB7XG4gICAgICBpZiAoY29uZi5vZmZzZXQpIHtcbiAgICAgICAgaW5wdXRPcHRpb25zLnB1c2goYC1zcyAke2NvbmYub2Zmc2V0fWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZi5kdXJhdGlvbikge1xuICAgICAgICBpbnB1dE9wdGlvbnMucHVzaChgLXQgJHtjb25mLmR1cmF0aW9ufWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBvdXRwdXRPcHRpb25zLnVuc2hpZnQoYC1pICR7cGFsZXR0ZUZpbGVQYXRofWApO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgICAgIGlmIChjb25mLmRlbGV0ZVBhbGV0dGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGQuc3luYyhbcGFsZXR0ZUZpbGVQYXRoXSwge1xuICAgICAgICAgICAgICBmb3JjZTogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKG91dHB1dCk7XG4gICAgICAgIH1cblxuICAgICAgICBmZm1wZWdcbiAgICAgICAgICAuaW5wdXRPcHRpb25zKGlucHV0T3B0aW9ucylcbiAgICAgICAgICAub3V0cHV0T3B0aW9ucyhvdXRwdXRPcHRpb25zKVxuICAgICAgICAgIC5vbignZW5kJywgY29tcGxldGUpXG4gICAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdClcbiAgICAgICAgICAub3V0cHV0KG91dHB1dClcbiAgICAgICAgICAucnVuKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZVBhbGV0dGUoKVxuICAgICAgLnRoZW4oY3JlYXRlR2lmKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2QgdG8gY3JlYXRlIGEgc2hvcnQgZ2lmIHRodW1ibmFpbCBmcm9tIGFuIG1wNCB2aWRlb1xuICAgKlxuICAgKiBAbWV0aG9kIGdlbmVyYXRlR2lmQ2JcbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuZnBzXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLnNjYWxlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLnNwZWVkTXVsdGlwbGVcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmRlbGV0ZVBhbGV0dGVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSAoZXJyLCBhcnJheSlcbiAgICpcbiAgICogQHB1YmxpY1xuICAgKi9cbiAgZ2VuZXJhdGVHaWZDYihvcHRzLCBjYikge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gY2IgfHwgb3B0cztcblxuICAgIHRoaXMuZ2VuZXJhdGVHaWYob3B0cylcbiAgICAgIC50aGVuKHJlc3VsdCA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQpKVxuICAgICAgLmNhdGNoKGNhbGxiYWNrKTtcbiAgfVxufVxuIl19
