(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const UI_CONST = KB.UI_CONSTANTS = KB.UI_CONSTANTS || {};

  function isFiniteNumber(value) {
    return (typeof value === 'number' && Number.isFinite(value));
  }

  function deepFreezeAdjustPanelStruct(struct) {
    if (!struct || typeof struct !== 'object') return struct;
    const ranges = struct.ranges;
    if (ranges && typeof ranges === 'object') {
      if (ranges.opacity && typeof ranges.opacity === 'object') Object.freeze(ranges.opacity);
      if (ranges.scale && typeof ranges.scale === 'object') Object.freeze(ranges.scale);
      if (ranges.offset && typeof ranges.offset === 'object') Object.freeze(ranges.offset);
      Object.freeze(ranges);
    }
    if (struct.defaults && typeof struct.defaults === 'object') {
      Object.freeze(struct.defaults);
    }
    return Object.freeze(struct);
  }

  const baseAdjustPanel = deepFreezeAdjustPanelStruct({
    width: 280,
    containerGap: 10,
    titleFontWeight: 600,
    titleFontSize: 14,
    labelFontWeight: 500,
    labelFontSize: 12,
    rowGap: 4,
    inlineGap: 8,
    offsetWrapperGap: 8,
    valueMinWidth: 48,
    numberInputWidth: 64,
    buttonsGap: 8,
    buttonsMarginTop: 6,
    buttonPaddingY: 4,
    opacityPrecision: 2,
    scalePrecision: 2,
    ranges: {
      opacity: { min: 0, max: 1, step: 0.01 },
      scale: { min: 0.2, max: 10, step: 0.01 },
      offset: { min: -1000, max: 1000, step: 1 },
    },
    defaults: {
      opacity: 0.2,
      scale: 1,
      dx: 0,
      dy: 0,
    },
  });

  const existing = UI_CONST.adjustPanel || {};
  const existingRanges = existing.ranges || {};
  const existingDefaults = existing.defaults || {};

  const mergedRanges = {
    opacity: {
      min: isFiniteNumber(existingRanges.opacity && existingRanges.opacity.min)
        ? existingRanges.opacity.min
        : baseAdjustPanel.ranges.opacity.min,
      max: isFiniteNumber(existingRanges.opacity && existingRanges.opacity.max)
        ? existingRanges.opacity.max
        : baseAdjustPanel.ranges.opacity.max,
      step: isFiniteNumber(existingRanges.opacity && existingRanges.opacity.step)
        ? existingRanges.opacity.step
        : baseAdjustPanel.ranges.opacity.step,
    },
    scale: {
      min: isFiniteNumber(existingRanges.scale && existingRanges.scale.min)
        ? existingRanges.scale.min
        : baseAdjustPanel.ranges.scale.min,
      max: isFiniteNumber(existingRanges.scale && existingRanges.scale.max)
        ? existingRanges.scale.max
        : baseAdjustPanel.ranges.scale.max,
      step: isFiniteNumber(existingRanges.scale && existingRanges.scale.step)
        ? existingRanges.scale.step
        : baseAdjustPanel.ranges.scale.step,
    },
    offset: {
      min: isFiniteNumber(existingRanges.offset && existingRanges.offset.min)
        ? existingRanges.offset.min
        : baseAdjustPanel.ranges.offset.min,
      max: isFiniteNumber(existingRanges.offset && existingRanges.offset.max)
        ? existingRanges.offset.max
        : baseAdjustPanel.ranges.offset.max,
      step: isFiniteNumber(existingRanges.offset && existingRanges.offset.step)
        ? existingRanges.offset.step
        : baseAdjustPanel.ranges.offset.step,
    },
  };

  const mergedDefaults = {
    opacity: isFiniteNumber(existingDefaults.opacity)
      ? existingDefaults.opacity
      : baseAdjustPanel.defaults.opacity,
    scale: isFiniteNumber(existingDefaults.scale)
      ? existingDefaults.scale
      : baseAdjustPanel.defaults.scale,
    dx: isFiniteNumber(existingDefaults.dx)
      ? existingDefaults.dx
      : baseAdjustPanel.defaults.dx,
    dy: isFiniteNumber(existingDefaults.dy)
      ? existingDefaults.dy
      : baseAdjustPanel.defaults.dy,
  };

  const mergedAdjustPanel = {
    width: isFiniteNumber(existing.width) ? existing.width : baseAdjustPanel.width,
    containerGap: isFiniteNumber(existing.containerGap) ? existing.containerGap : baseAdjustPanel.containerGap,
    titleFontWeight: isFiniteNumber(existing.titleFontWeight) ? existing.titleFontWeight : baseAdjustPanel.titleFontWeight,
    titleFontSize: isFiniteNumber(existing.titleFontSize) ? existing.titleFontSize : baseAdjustPanel.titleFontSize,
    labelFontWeight: isFiniteNumber(existing.labelFontWeight) ? existing.labelFontWeight : baseAdjustPanel.labelFontWeight,
    labelFontSize: isFiniteNumber(existing.labelFontSize) ? existing.labelFontSize : baseAdjustPanel.labelFontSize,
    rowGap: isFiniteNumber(existing.rowGap) ? existing.rowGap : baseAdjustPanel.rowGap,
    inlineGap: isFiniteNumber(existing.inlineGap) ? existing.inlineGap : baseAdjustPanel.inlineGap,
    offsetWrapperGap: isFiniteNumber(existing.offsetWrapperGap) ? existing.offsetWrapperGap : baseAdjustPanel.offsetWrapperGap,
    valueMinWidth: isFiniteNumber(existing.valueMinWidth) ? existing.valueMinWidth : baseAdjustPanel.valueMinWidth,
    numberInputWidth: isFiniteNumber(existing.numberInputWidth) ? existing.numberInputWidth : baseAdjustPanel.numberInputWidth,
    buttonsGap: isFiniteNumber(existing.buttonsGap) ? existing.buttonsGap : baseAdjustPanel.buttonsGap,
    buttonsMarginTop: isFiniteNumber(existing.buttonsMarginTop) ? existing.buttonsMarginTop : baseAdjustPanel.buttonsMarginTop,
    buttonPaddingY: isFiniteNumber(existing.buttonPaddingY) ? existing.buttonPaddingY : baseAdjustPanel.buttonPaddingY,
    opacityPrecision: isFiniteNumber(existing.opacityPrecision) ? existing.opacityPrecision : baseAdjustPanel.opacityPrecision,
    scalePrecision: isFiniteNumber(existing.scalePrecision) ? existing.scalePrecision : baseAdjustPanel.scalePrecision,
    ranges: mergedRanges,
    defaults: mergedDefaults,
  };

  UI_CONST.adjustPanel = deepFreezeAdjustPanelStruct(mergedAdjustPanel);

  const defaultsContainer = UI_CONST.__defaults = UI_CONST.__defaults || {};
  defaultsContainer.adjustPanel = baseAdjustPanel;
})(typeof window !== 'undefined' ? window : this);
