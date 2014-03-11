/**
 * @overview 3D-panorama
 * @module 3d_panorama
 * @exports Panorama
 * @requires requirejs
 * @requires jquery
 * @requires jquery.mousewheel
 * @requires three
 *
 * @see {@link https://github.com/unclechu/html5-ecmascript-3d-panorama/|GitHub}
 * @author Viacheslav Lotsmanov
 * @copyright Based on panorama demo of three.js (http://mrdoob.github.io/three.js/examples/canvas_geometry_panorama.html)
 * @license GPLv3
 */

define(['jquery', 'three', 'jquery.mousewheel'],
/** @lends Panorama */
function ($, THREE) {
    var sides = ['right', 'left', 'top', 'bottom', 'back', 'front'];

    /**
     * @description You need to set "params" keys "panoramaCode" and "imgPathMask" both or absolute paths to key "sideTextures"
     * @name Panorama
     * @constructor
     * @public
     *
     * @param {jQuery|string|DOM} $selector jQuery object of container or string of selector or DOM-element
     * @param {Panorama~params} params Parameters
     * @param {Panorama~createInstanceCallback} [callback] Callback after instance created (asynchronus)
     *
     * @exception {Panorama~IncorrectArgument}
     * @exception {Panorama~RequiredParameter}
     * @exception {Panorama~RequiredSideTexture}
     * @exception {Panorama~NoContainer}
     * @exception {Panorama~ContainerZeroSize}
     * @exception {Panorama~SinglePanoramaPerContainer}
     */
    function Panorama($selector, params/*[, callback]*/) {
        /** @private */
        var self = this;

        /** @private */
        var private = {

            /**
             * @typedef Panorama~params
             * @type {Object.<*>}
             * @prop {string} panoramaCode Specific name of panorama for replacing in imgPathMask
             * @prop {string} imgPathMask Mask of path to image file of side of the panorama
             * @prop {Array.<string>} [sideNames='right', 'left', 'top', 'bottom', 'back', 'front'] Side names (for imgPathMask)
             * @prop {Panorama~sideTextures} [sideTextures=null] Key-value object of absolute paths to side-textures
             * @prop {number} [startFov=75] Start fov value
             * @prop {number} [minFov=10] Minimal fov value (for zoom)
             * @prop {number} [maxFov=75] Maximum fov value (for zoom)
             * @prop {float} [fovMouseStep=2.0] Step of zoom by mouse wheel
             */
            /**
             * @private
             * @instance
             * @type {Panorama~params}
             * @name Panorama.params
             */
            params: null,

            /**
             * @callback Panorama~createInstanceCallback
             * @param {Error|Null} err Exception instance or null if no errors
             * @this {Panorama} Instance of Panorama
             */
            /**
             * @private
             * @instance
             * @type {Panorama~createInstanceCallback}
             * @name Panorama.callback
             */
            callback: null,

            /**
             * @private
             * @instance
             * @type {THREE~Camera}
             * @name Panorama.camera
             */
            camera: null,

            /**
             * @private
             * @instance
             * @type {THREE~Scene}
             * @name Panorama.scene
             */
            scene: null,

            /**
             * @private
             * @instance
             * @type {jQuery}
             * @name Panorama.$texturePlaceholder
             */
            $texturePlaceholder: null,

            /**
             * @private
             * @instance
             * @type {DOM}
             * @name Panorama.textureContext
             */
            textureContext: null,

            /**
             * @private
             * @instance
             * @type {Array.<string>}
             * @name Panorama.materials
             */
            materials: null,

            /**
             * @private
             * @instance
             * @type {THREE~Mesh}
             * @name Panorama.mesh
             */
            mesh: null,

            /**
             * @private
             * @instance
             * @type {THREE~Vector3}
             * @name Panorama.target
             */
            target: null,

            /**
             * @private
             * @instance
             * @type {float}
             * @name Panorama.lon
             * @default 90.0
             */
            lon: 90.0,

            /**
             * @private
             * @instance
             * @type {float}
             * @name Panorama.lat
             * @default 0.0
             */
            lat: 0.0,

            /**
             * @private
             * @instance
             * @type {float}
             * @name Panorama.phi
             * @default 0.0
             */
            phi: 0.0,

            /**
             * @private
             * @instance
             * @type {float}
             * @name Panorama.theta
             * @default 0.0
             */
            theta: 0.0,

            /**
             * @private
             * @instance
             * @type {float}
             * @name Panorama.holdByUser
             * @default false
             */
            holdByUser: false,

            /**
             * @private
             * @instance
             * @type {THREE~CanvasRenderer}
             * @name Panorama.renderer
             */
            renderer: null,

            // only for handlers

            /**
             * @private
             * @instance
             * @type {Object}
             * @name Panorama.mouseDownState
             */
            mouseDownState: null,

            /**
             * @private
             * @instance
             * @type {Object}
             * @name Panorama.touchStartState
             */
            touchStartState: null

        };

        /**
         * Getter helper
         *
         * @protected
         * @instance
         * @exception {Panorama~UnknownPrivateVariableName}
         * @returns {*} Private variable value
         */
        this.__getter = function getter(name) {
            if (name in private) {
                return private[name];
            } else {
                throw new self.exceptions.UnknownPrivateVariableName(null, name);
            }
        };

        /**
         * Setter helper
         *
         * @protected
         * @instance
         * @exception {Panorama~UnknownPrivateVariableName}
         */
        this.__setter = function setter(name, val) {
            if (name in private) {
                private[name] = val;
            } else {
                throw new self.exceptions.UnknownPrivateVariableName(null, name);
            }
        };

        /**
         * Cleanup private variables (destroy helper)
         *
         * @protected
         * @instance
         */
        this.__destroy = function __destroy() {
            delete $selector;
            delete params;
            for (var key in private) {
                delete private[key];
            }
            delete private;
        };

        if (!$.isPlainObject(params)) {
            self.makeError(new self.exceptions.IncorrectArgument());
            return false;
        }

        // Parse optional arguments
        if (!Array.prototype.slice.call(arguments, 2).every(function (arg, i) {
            if (i > 0) {
                self.makeError(new self.exceptions.IncorrectArgument());
                return false;
            }

            if ($.type(arg) === 'function') {
                if (!private.callback) {
                    private.callback = arg;
                } else {
                    self.makeError(new self.exceptions.IncorrectArgument());
                    return false;
                }
            } else {
                self.makeError(new self.exceptions.IncorrectArgument());
                return false;
            }

            return true;
        })) return false;

        private.params = $.extend({

            // default values

            panoramaCode: null,
            imgPathMask: null,
            sideNames: sides.slice(0), // clone

            /**
             * @typedef Panorama~sideTextures
             * @type {Object.<string>}
             * @prop {string} right Example: '/panorama/right.png'
             * @prop {string} left Example: '/panorama/right.png'
             * @prop {string} top Example: '/panorama/top.png'
             * @prop {string} bottom Example: '/panorama/bottom.png'
             * @prop {string} back Example: '/panorama/back.png'
             * @prop {string} front Example: '/panorama/front.png'
             */
            sideTextures: null,

            startFov: 75,
            minFov: 10,
            maxFov: 75,
            fovMouseStep: 2.0,

        }, params);

        // check for required parameters
        if (private.params.sideTextures === null) {
            if (private.params.panoramaCode === null
            || private.params.imgPathMask === null) {
                this.makeError(new this.exceptions.RequiredParameter());
                return false;
            }
        } else {
            if (!sides.every(function (side) {
                if (!(side in private.params.sideTextures)) {
                    self.makeError(
                        new self.exceptions
                            .RequiredSideTexture('No '+side+' side texture')
                    );
                    return false;
                }
                return true;
            })) return false;
        }

        /**
         * Container of the panorama
         *
         * @type jQuery
         * @public
         * @instance
         */
        this.$container = $($selector);

        if (this.$container.size() < 1) {
            this.makeError(new this.exceptions.NoContainer());
            return false;
        }
        if (this.$container.width() < 1 || this.$container.height() < 1) {
            this.makeError(new this.exceptions.ContainerZeroSize());
            return false;
        }

        if (this.$container.data('panorama')) {
            this.makeError(new this.exceptions.SinglePanoramaPerContainer());
            return false;
        }

        /**
         * Unique panorama identificator.
         * Value is automatically generated when created constructor instance.
         * Will be used for bind handlers.
         *
         * @type string
         * @public
         * @instance
         */
        this.panoramaId = 'panorama_id_'
            + (new Date()).getTime()
            + Math.round(Math.random() * 1000000000);

        private.camera = new THREE.PerspectiveCamera(
            private.params.startFov,
            this.$container.width() / this.$container.height(),
            1, 1000
        );
        private.scene = new THREE.Scene();

        private.$texturePlaceholder = $('<canvas/>');
        private.$texturePlaceholder.width(128);
        private.$texturePlaceholder.height(128);

        private.textureContext
            = private.$texturePlaceholder.get(0).getContext('2d');
        private.textureContext.fillStyle = 'rgb(200, 200, 200)';
        private.textureContext.fillRect(
            0, 0,
            private.$texturePlaceholder.width(),
            private.$texturePlaceholder.height()
        );

        private.materials = [];
        if (private.params.sideTextures === null) {
            private.params.sideNames.every(function (side) {
                private.materials.push(
                    self.loadTexture(
                        private.params.imgPathMask
                            .replace(/#PANORAMA_CODE#/g, private.params.panoramaCode)
                            .replace(/#SIDE#/g, side)
                    )
                );
                return true;
            });
        } else {
            sides.every(function (side) {
                private.materials.push(self.loadTexture(
                    private.params.sideTextures[side]
                ));
                return true;
            });
        }

        private.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(300, 300, 300, 7, 7, 7),
            new THREE.MeshFaceMaterial(private.materials)
        );
        private.mesh.scale.x = -1;
        private.scene.add(private.mesh);

        private.target = new THREE.Vector3();

        private.renderer = new THREE.CanvasRenderer();
        private.renderer.setSize(
            this.$container.width(),
            this.$container.height()
        );

        /**
         * Wrapper of the panorama that putted to container of the panorama
         *
         * @type jQuery
         * @public
         * @instance
         */
        this.$panoramaWrapper = $('<div/>').addClass('panorama_wrapper');

        this.$panoramaWrapper.html( private.renderer.domElement );
        this.$container.append( this.$panoramaWrapper );

        this.$container.data('panorama', this);

        /**
         * @protected
         * @instance
         * @type function
         */
        this.resizeHandlerWrapper
        = function resizeHandlerWrapper() {
            self.handlers.resizeHandler.call(this, self);
        };

        $(window).bind(
            'resize.' + this.panoramaId,
            this.resizeHandlerWrapper
        );

        /** move camera by mouse */
        this.$container.bind(
            'mousedown.' + this.panoramaId,
            this.handlers.mouseDownHandler
        );
        this.$container.bind(
            'mousemove.' + this.panoramaId,
            this.handlers.mouseMoveHandler
        );
        this.$container.bind(
            'mouseup.' + this.panoramaId,
            this.handlers.mouseUpHandler
        );

        /** zoom by mouse scroll */
        this.$container.bind(
            'mousewheel.' + this.panoramaId,
            this.handlers.mouseWheelHandler
        );

        /** move camera by touch pad */
        this.$container.bind(
            'touchstart.' + this.panoramaId,
            this.handlers.touchStartHandler
        );
        this.$container.bind(
            'touchmove.' + this.panoramaId,
            this.handlers.touchMoveHandler
        );
        this.$container.bind(
            'touchend.' + this.panoramaId,
            this.handlers.touchEndHandler
        );

        // draw first frame
        this.draw();

        if (private.callback) {
            setTimeout(function () {
                private.callback.call(self, null);
            }, 1);
        }
    }

    /**
     * Load texture helper
     *
     * @memberOf Panorama
     * @param {string} path Path to texture image file
     * @protected
     * @static
     * @returns {THREE~Texture}
     */
    Panorama.prototype.loadTexture
    = function loadTexture(path) {
        var texture = new THREE.Texture(this.__getter('$texturePlaceholder').get(0));
        var material = new THREE.MeshBasicMaterial({
            map: texture,
            overdraw: true
        });

        $('<img/>').load(function () {
            texture.image = this;
            texture.needsUpdate = true;
        }).attr('src', path);

        return material;
    };

    /**
     * Animation loop
     *
     * @memberOf Panorama
     * @public
     * @static
     */
    Panorama.prototype.animationLoop
    = function animationLoop() {
        var self = this;
        requestAnimationFrame(function () {
            if (!self.$container) return; // destroyed
            self.animationLoop.call(self);
        });
        self.draw();
    };

    /**
     * Draw panorama frame
     *
     * @memberOf Panorama
     * @public
     * @static
     */
    Panorama.prototype.draw
    = function draw() {
        if (this.__getter('holdByUser') === false)
            this.__setter('lon', this.__getter('lon') + 0.1);

        if (this.__getter('lon') >= 360.0) this.__setter('lon', 0.0);

        this.__setter('lat', Math.max(-85.0, Math.min(85.0, this.__getter('lat'))) );
        this.__setter('phi', THREE.Math.degToRad(90.0 - this.__getter('lat')) );
        this.__setter('theta', THREE.Math.degToRad(this.__getter('lon')) );

        this.__getter('target').x = 500.0 * Math.sin(this.__getter('phi')) * Math.cos(this.__getter('theta'));
        this.__getter('target').y = 500.0 * Math.cos(this.__getter('phi'));
        this.__getter('target').z = 500.0 * Math.sin(this.__getter('phi')) * Math.sin(this.__getter('theta'));

        this.__getter('camera').lookAt(this.__getter('target'));
        this.__getter('renderer').render(this.__getter('scene'), this.__getter('camera'));
    };

    /**
     * Destroy the constructor instance
     *
     * @memberOf Panorama
     * @public
     * @static
     */
    Panorama.prototype.destroy
    = function destroy() {
        var self = this;

        this.$container.unbind('.' + this.panoramaId);
        $(window).unbind('.' + this.panoramaId);
        this.$panoramaWrapper.remove();
        this.$container.removeData('panorama');

        // cleanup protected instance variables
        this.$container = undefined;
        this.$panoramaWrapper = undefined;
        this.panoramaId = undefined;
        this.resizeHandlerWrapper = undefined;

        // cleanup private variables
        this.__destroy();

        this.__destroy = undefined;
        this.__getter = undefined;
        this.__setter = undefined;
    };

    /**
     * Throw error or delegate to callback
     *
     * @memberOf Panorama
     * @protected
     * @static
     * @param {Error} exception
     * @exception {Error} Any exception that in "exception" argument
     * @returns {boolean} Returns true or throws exception
     */
    Panorama.prototype.makeError
    = function makeError(exception) {
        var self = this;
        if (this.__getter('callback')) {
            setTimeout(function () {
                self.__getter('callback').call(self, exception);
                self.destroy();
            }, 1);
            return true;
        }
        throw exception;
    };

    /**
     * Panorama exceptions
     *
     * @memberOf Panorama
     * @public
     * @type {Object.<Error>}
     * @prop {Panorama~IncorrectArgument} IncorrectArgument Incorrect argument of constructor
     * @prop {Panorama~RequiredParameter} RequiredParameter Required parameters: "panoramaCode" and "imgPathMask" both or "sideTextures"
     * @prop {Panorama~RequiredSideTexture} RequiredSideTexture No side texture
     * @prop {Panorama~NoContainer} NoContainer Attempt to create instance of Panorama without container
     * @prop {Panorama~ContainerZeroSize} ContainerZeroSize jQuery object of container has no DOM-elements
     * @prop {Panorama~SinglePanoramaPerContainer} SinglePanoramaPerContainer Attempt to create more than one panoramas in same container
     * @prop {Panorama~UnknownPrivateVariableName} UnknownPrivateVariableName Unknown name of private variable
     * @prop {Panorama~HandlerCannotFoundThePanorama} HandlerCannotFoundThePanorama Panorama removed but handler still triggers
     * @static
     */
    Panorama.exceptions = {};

    // Helper for new exception
    function baseException() {
        this.constructor.prototype.__proto__ = Error.prototype;
        Error.call(this);
        this.name = this.constructor.name;
    }

    /** @typedef {Error} Panorama~IncorrectArgument */
    Panorama.exceptions.IncorrectArgument
    = function IncorrectArgument(message) {
        baseException.call(this);
        this.message = message || 'Incorrect argument of constructor';
    };

    /** @typedef {Error} Panorama~RequiredParameter */
    Panorama.exceptions.RequiredParameter
    = function RequiredParameter(message) {
        baseException.call(this);
        this.message = message || 'Required parameters: "panoramaCode" and "imgPathMask" both or "sideTextures"';
    };

    /** @typedef {Error} Panorama~RequiredSideTexture */
    Panorama.exceptions.RequiredSideTexture
    = function RequiredSideTexture(message) {
        baseException.call(this);
        this.message = message || 'No side texture';
    };

    /** @typedef {Error} Panorama~NoContainer */
    Panorama.exceptions.NoContainer
    = function NoContainer(message) {
        baseException.call(this);
        this.message = message || 'Attempt to create instance of Panorama without container';
    };

    /** @typedef {Error} Panorama~ContainerZeroSize */
    Panorama.exceptions.ContainerZeroSize
    = function ContainerZeroSize(message) {
        baseException.call(this);
        this.message = message || 'jQuery object of container has no DOM-elements';
    };

    /** @typedef {Error} Panorama~SinglePanoramaPerContainer */
    Panorama.exceptions.SinglePanoramaPerContainer
    = function SinglePanoramaPerContainer(message) {
        baseException.call(this);
        this.message = message || 'Attempt to create more than one panoramas in same container';
    };

    /** @typedef {Error} Panorama~UnknownPrivateVariableName */
    Panorama.exceptions.UnknownPrivateVariableName
    = function UnknownPrivateVariableName(message, varName) {
        baseException.call(this);
        this.message = message || 'Unknown name of private variable'
            +((varName) ? ' ("'+varName+'")' : '');
    };

    /** @typedef {Error} Panorama~HandlerCannotFoundThePanorama */
    Panorama.exceptions.HandlerCannotFoundThePanorama
    = function HandlerCannotFoundThePanorama(message) {
        baseException.call(this);
        this.message = message || 'Panorama removed but handler still triggers';
    };

    // Provide exceptions to instance of constructor too
    Panorama.prototype.exceptions = Panorama.exceptions;

    /**
     * Panorama handlers
     *
     * @memberOf Panorama
     * @public
     * @type {Object.<function>}
     * @prop {Panorama~resizeHandler} resizeHandler
     * @prop {function} mouseDownHandler
     * @prop {function} mouseMoveHandler
     * @prop {function} mouseUpHandler
     * @prop {function} mouseWheelHandler
     * @prop {function} touchStartHandler
     * @prop {function} touchMoveHandler
     * @prop {function} touchEndHandler
     * @static
     */
    Panorama.handlers = {};

    /**
     * @callback Panorama~resizeHandler
     * @param {Panorama} panorama Instance of Panorama
     */
    Panorama.handlers.resizeHandler
    = function resizeHandler(panorama) {
        panorama.__getter('camera').aspect =
            panorama.$container.width() / panorama.$container.height();
        panorama.__getter('camera').updateProjectionMatrix();

        panorama.__getter('renderer').setSize(
            panorama.$container.width(), panorama.$container.height()
        );
    };

    // Handler helper to get panorama by container (this)
    function getPanorama() {
        var panorama = $(this).data('panorama');
        if (!panorama)
            throw new Panorama.exceptions.HandlerCannotFoundThePanorama();

        return panorama;
    }

    Panorama.handlers.mouseDownHandler
    = function mouseDownHandler(event) {
        var panorama = getPanorama.call(this);

        panorama.__setter('holdByUser', true);
        panorama.__setter('mouseDownState', {
            clientX: event.clientX,
            clientY: event.clientY,
            lon: panorama.__getter('lon'),
            lat: panorama.__getter('lat')
        });

        return false;
    };

    Panorama.handlers.mouseMoveHandler
    = function mouseMoveHandler(event) {
        var panorama = getPanorama.call(this);

        if (panorama.__getter('holdByUser') === true
        && panorama.__getter('mouseDownState')) {
            panorama.__setter('lon',
                (panorama.__getter('mouseDownState').clientX - event.clientX)
                * 0.1 + panorama.__getter('mouseDownState').lon
            );
            panorama.__setter('lat',
                (event.clientY - panorama.__getter('mouseDownState').clientY)
                * 0.1 + panorama.__getter('mouseDownState').lat
            );
        }

        return false;
    };

    Panorama.handlers.mouseUpHandler
    = function mouseUpHandler(event) {
        var panorama = getPanorama.call(this);

        panorama.__setter('mouseDownState', undefined);
        panorama.__setter('holdByUser', false);

        return false;
    };

    Panorama.handlers.mouseWheelHandler
    = function mouseWheelHandler(event) {
        var panorama = getPanorama.call(this);

        if (event.deltaY == 1) {
            if (panorama.__getter('camera').fov - panorama.__getter('params').fovMouseStep
            < panorama.__getter('params').minFov) return false;

            panorama.__getter('camera').fov -= panorama.__getter('params').fovMouseStep;
            panorama.__getter('camera').updateProjectionMatrix();
        } else if (event.deltaY == -1) {
            if (panorama.__getter('camera').fov + panorama.__getter('params').fovMouseStep
            > panorama.__getter('params').maxFov) return false;

            panorama.__getter('camera').fov += panorama.__getter('params').fovMouseStep;
            panorama.__getter('camera').updateProjectionMatrix();
        }

        return false;
    };

    Panorama.handlers.touchStartHandler
    = function touchStartHandler(event) {
        var panorama = getPanorama.call(this);

        panorama.__setter('holdByUser', true);
        if (event.touches.length == 1) {
            panorama.__setter('touchStartState', {
                pageX: event.touches[0].pageX,
                pageY: event.touches[0].pageY,
                lon: panorama.__getter('lon'),
                lat: panorama.__getter('lat')
            });
        }

        return false;
    };

    Panorama.handlers.touchMoveHandler
    = function touchMoveHandler(event) {
        var panorama = getPanorama.call(this);

        if (panorama.__getter('holdByUser') && event.touches.length == 1
        && panorama.__getter('touchStartState')) {
            panorama.__setter('lon',
                (panorama.__getter('touchStartState').pageX - event.touches[0].pageX)
                * 0.1 + panorama.__getter('touchStartState').lon
            );
            panorama.__setter('lat',
                (event.touches[0].pageY - panorama.__getter('touchStartState').pageY)
                * 0.1 + panorama.__getter('touchStartState').lat
            );
        }

        return false;
    };

    Panorama.handlers.touchEndHandler
    = function touchEndHandler(event) {
        var panorama = getPanorama.call(this);

        panorama.__setter('touchStartState', undefined);
        panorama.__setter('holdByUser', false);

        return false;
    };

    // Provide handlers to instance of constructor too
    Panorama.prototype.handlers = Panorama.handlers;

    return Panorama;

});
