(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils || {};
  const {
    cssUrl,
    isVideoMedia,
    objectFitFromSize,
    buildTransformString,
    ensureVideoDefaults,
    setVideoSource,
    disposeVideo,
  } = utils;

  KB.createBehindChannel = KB.createBehindChannel || function createBehindChannel({ ensureAddStyle }) {
    ensureAddStyle = typeof ensureAddStyle === 'function' ? ensureAddStyle : (css) => {
      const style = document.createElement('style');
      style.textContent = css;
      document.documentElement.appendChild(style);
    };
    ensureAddStyle('html, body { min-height: 100%; }');

    const STYLE_ID = 'kabegami-layer-behind-style';
    if (!document.getElementById(STYLE_ID)) {
      const css = `:root {\n  --kabegami-body-image: none;\n  --kabegami-body-size: auto;\n  --kabegami-body-position: center center;\n  --kabegami-body-attachment: scroll;\n  --kabegami-body-filter: none;\n  --kabegami-before-image: none;\n  --kabegami-before-size: cover;\n  --kabegami-before-position: center center;\n  --kabegami-before-attachment: fixed;\n  --kabegami-before-opacity: 1;\n  --kabegami-before-blend: normal;\n  --kabegami-before-origin: center center;\n  --kabegami-before-transform: none;\n  --kabegami-before-filter: none;\n}\nbody.kabegami-layer-body {\n  background-image: var(--kabegami-body-image) !important;\n  background-size: var(--kabegami-body-size) !important;\n  background-position: var(--kabegami-body-position) !important;\n  background-repeat: no-repeat !important;\n  background-attachment: var(--kabegami-body-attachment) !important;\n  filter: var(--kabegami-body-filter);\n}\nbody.kabegami-layer-before {\n  position: relative !important;\n}\nbody.kabegami-layer-before::before {\n  content: '';\n  position: fixed;\n  inset: 0;\n  background-image: var(--kabegami-before-image);\n  background-size: var(--kabegami-before-size);\n  background-position: var(--kabegami-before-position);\n  background-repeat: no-repeat;\n  background-attachment: var(--kabegami-before-attachment);\n  opacity: var(--kabegami-before-opacity);\n  pointer-events: none;\n  z-index: -1;\n  mix-blend-mode: var(--kabegami-before-blend);\n  transform-origin: var(--kabegami-before-origin);\n  transform: var(--kabegami-before-transform);\n  filter: var(--kabegami-before-filter);\n}\nbody:not(.kabegami-layer-before)::before {\n  content: none !important;\n}\n`;
      const styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = css;
      document.documentElement.appendChild(styleEl);
    }

    const rootStyle = document.documentElement.style;
    let bodyVideo = null;
    let beforeVideo = null;
    const BODY_PROPS = [
      '--kabegami-body-image',
      '--kabegami-body-size',
      '--kabegami-body-position',
      '--kabegami-body-attachment',
      '--kabegami-body-filter',
    ];
    const BEFORE_PROPS = [
      '--kabegami-before-image',
      '--kabegami-before-size',
      '--kabegami-before-position',
      '--kabegami-before-attachment',
      '--kabegami-before-opacity',
      '--kabegami-before-blend',
      '--kabegami-before-origin',
      '--kabegami-before-transform',
      '--kabegami-before-filter',
    ];

    function setProp(name, value) {
      if (value == null || value === '') rootStyle.removeProperty(name);
      else rootStyle.setProperty(name, value);
    }

    function clearProps(list) {
      list.forEach((p) => rootStyle.removeProperty(p));
    }

    function ensureBodyVideo() {
      if (bodyVideo && !document.body.contains(bodyVideo)) {
        bodyVideo = disposeVideo(bodyVideo);
      }
      if (!bodyVideo) {
        bodyVideo = document.createElement('video');
        bodyVideo.id = 'kabegami-body-video';
        ensureVideoDefaults(bodyVideo);
        Object.assign(bodyVideo.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: '-1',
          display: 'block',
        });
        document.body.appendChild(bodyVideo);
      }
      return bodyVideo;
    }

    function ensureBeforeVideo() {
      if (beforeVideo && !document.body.contains(beforeVideo)) {
        beforeVideo = disposeVideo(beforeVideo);
      }
      if (!beforeVideo) {
        beforeVideo = document.createElement('video');
        beforeVideo.id = 'kabegami-before-video';
        ensureVideoDefaults(beforeVideo);
        Object.assign(beforeVideo.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          display: 'block',
        });
        document.body.appendChild(beforeVideo);
      }
      return beforeVideo;
    }

    return {
      apply(state) {
        const imageValue = `url("${cssUrl(state.resolvedUrl)}")`;
        const isVideo = isVideoMedia(state.mediaType);
        const visible = state.eff.visibility !== 'hidden';
        if (state.mode === 1) {
          document.body.classList.add('kabegami-layer-body');
          document.body.classList.remove('kabegami-layer-before');
          if (isVideo) {
            clearProps(BODY_PROPS);
            clearProps(BEFORE_PROPS);
            beforeVideo = disposeVideo(beforeVideo);
            const vid = ensureBodyVideo();
            vid.style.display = visible ? 'block' : 'none';
            vid.style.position = state.eff.attach === 'fixed' ? 'fixed' : 'absolute';
            vid.style.top = '0';
            vid.style.left = '0';
            vid.style.width = '100vw';
            vid.style.height = '100vh';
            vid.style.objectFit = objectFitFromSize(state.eff.size);
            vid.style.objectPosition = state.eff.position;
            vid.style.opacity = String(state.eff.opacity);
            vid.style.mixBlendMode = state.eff.blend || 'normal';
            vid.style.filter = state.eff.filter || 'none';
            vid.style.transformOrigin = state.style.transformOrigin || 'center center';
            vid.style.transform = buildTransformString(state.style);
            vid.style.zIndex = '-1';
            setVideoSource(vid, state.resolvedUrl);
          } else {
            bodyVideo = disposeVideo(bodyVideo);
            setProp('--kabegami-body-image', imageValue);
            setProp('--kabegami-body-size', state.eff.size);
            setProp('--kabegami-body-position', state.eff.position);
            setProp('--kabegami-body-attachment', state.eff.attach);
            setProp('--kabegami-body-filter', state.eff.filter || 'none');
            clearProps(BEFORE_PROPS);
          }
        } else {
          document.body.classList.add('kabegami-layer-before');
          document.body.classList.remove('kabegami-layer-body');
          if (isVideo) {
            clearProps(BODY_PROPS);
            setProp('--kabegami-before-image', 'none');
            setProp('--kabegami-before-size', 'auto');
            setProp('--kabegami-before-position', 'center center');
            setProp('--kabegami-before-attachment', 'fixed');
            setProp('--kabegami-before-opacity', '1');
            setProp('--kabegami-before-blend', 'normal');
            setProp('--kabegami-before-filter', 'none');
            setProp('--kabegami-before-transform', 'none');
            setProp('--kabegami-before-origin', state.style.transformOrigin || 'center center');
            bodyVideo = disposeVideo(bodyVideo);
            const vid = ensureBeforeVideo();
            vid.style.display = visible ? 'block' : 'none';
            vid.style.position = state.eff.attach === 'fixed' ? 'fixed' : 'absolute';
            vid.style.top = '0';
            vid.style.left = '0';
            vid.style.width = '100vw';
            vid.style.height = '100vh';
            vid.style.objectFit = objectFitFromSize(state.eff.size);
            vid.style.objectPosition = state.eff.position;
            vid.style.opacity = String(state.eff.opacity);
            vid.style.mixBlendMode = state.eff.blend || 'normal';
            vid.style.filter = state.eff.filter || 'none';
            vid.style.transformOrigin = state.style.transformOrigin || 'center center';
            vid.style.transform = buildTransformString(state.style);
            const zIndex = state.eff.zIndex != null ? state.eff.zIndex : -1;
            vid.style.zIndex = String(zIndex);
            setVideoSource(vid, state.resolvedUrl);
          } else {
            beforeVideo = disposeVideo(beforeVideo);
            setProp('--kabegami-before-image', imageValue);
            setProp('--kabegami-before-size', state.eff.size);
            setProp('--kabegami-before-position', state.eff.position);
            setProp('--kabegami-before-attachment', state.eff.attach);
            setProp('--kabegami-before-opacity', String(state.eff.opacity));
            setProp('--kabegami-before-blend', state.eff.blend || 'normal');
            setProp('--kabegami-before-origin', state.style.transformOrigin || 'center center');
            setProp('--kabegami-before-transform', buildTransformString(state.style));
            setProp('--kabegami-before-filter', state.eff.filter || 'none');
            clearProps(BODY_PROPS);
          }
        }
      },
      clear() {
        document.body.classList.remove('kabegami-layer-body');
        document.body.classList.remove('kabegami-layer-before');
        clearProps(BODY_PROPS);
        clearProps(BEFORE_PROPS);
        bodyVideo = disposeVideo(bodyVideo);
        beforeVideo = disposeVideo(beforeVideo);
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);

