import RealHammer from "@egjs/hammerjs";

/**
 * Setup a mock hammer.js object, for unit testing.
 *
 * Inspiration: https://github.com/uber/deck.gl/pull/658
 * @returns {{on: noop, off: noop, destroy: noop, emit: noop, get: get}}
 */
function hammerMock() {
  const noop = () => {};

  return {
    on: noop,
    off: noop,
    destroy: noop,
    emit: noop,

    get() {
      return {
        set: noop,
      };
    },
  };
}

const Hammer =
  typeof window !== "undefined"
    ? window.Hammer || RealHammer
    : function () {
        // hammer.js is only available in a browser, not in node.js. Replacing it with a mock object.
        return hammerMock();
      };

export { Hammer };
