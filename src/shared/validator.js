import { copyAndExtendArray, copyArray } from "../util.ts";

let errorFound = false;
let allOptions;

export const VALIDATOR_PRINT_STYLE = "background: #FFeeee; color: #dd0000";

/**
 *  Used to validate options.
 */
export class Validator {
  /**
   * Main function to be called
   * @param {object} options
   * @param {object} referenceOptions
   * @param {object} subObject
   * @returns {boolean}
   * @static
   */
  static validate(options, referenceOptions, subObject) {
    errorFound = false;
    allOptions = referenceOptions;
    let usedOptions = referenceOptions;
    if (subObject !== undefined) {
      usedOptions = referenceOptions[subObject];
    }
    Validator.parse(options, usedOptions, []);
    return errorFound;
  }

  /**
   * Will traverse an object recursively and check every value
   * @param {object} options
   * @param {object} referenceOptions
   * @param {Array} path    | where to look for the actual option
   * @static
   */
  static parse(options, referenceOptions, path) {
    for (const option in options) {
      if (Object.prototype.hasOwnProperty.call(options, option)) {
        Validator.check(option, options, referenceOptions, path);
      }
    }
  }

  /**
   * Check every value. If the value is an object, call the parse function on that object.
   * @param {string} option
   * @param {object} options
   * @param {object} referenceOptions
   * @param {Array} path    | where to look for the actual option
   * @static
   */
  static check(option, options, referenceOptions, path) {
    if (
      referenceOptions[option] === undefined &&
      referenceOptions.__any__ === undefined
    ) {
      Validator.getSuggestion(option, referenceOptions, path);
      return;
    }

    let referenceOption = option;
    let is_object = true;

    if (
      referenceOptions[option] === undefined &&
      referenceOptions.__any__ !== undefined
    ) {
      // NOTE: This only triggers if the __any__ is in the top level of the options object.
      //       THAT'S A REALLY BAD PLACE TO ALLOW IT!!!!
      // TODO: Examine if needed, remove if possible

      // __any__ is a wildcard. Any value is accepted and will be further analysed by reference.
      referenceOption = "__any__";

      // if the any-subgroup is not a predefined object in the configurator,
      // we do not look deeper into the object.
      is_object = Validator.getType(options[option]) === "object";
    } else {
      // Since all options in the reference are objects, we can check whether
      // they are supposed to be the object to look for the __type__ field.
      // if this is an object, we check if the correct type has been supplied to account for shorthand options.
    }

    let refOptionObj = referenceOptions[referenceOption];
    if (is_object && refOptionObj.__type__ !== undefined) {
      refOptionObj = refOptionObj.__type__;
    }

    Validator.checkFields(
      option,
      options,
      referenceOptions,
      referenceOption,
      refOptionObj,
      path,
    );
  }

  /**
   *
   * @param {string}  option           | the option property
   * @param {object}  options          | The supplied options object
   * @param {object}  referenceOptions | The reference options containing all options and their allowed formats
   * @param {string}  referenceOption  | Usually this is the same as option, except when handling an __any__ tag.
   * @param {string}  refOptionObj     | This is the type object from the reference options
   * @param {Array}   path             | where in the object is the option
   * @static
   */
  static checkFields(
    option,
    options,
    referenceOptions,
    referenceOption,
    refOptionObj,
    path,
  ) {
    const log = function (message) {
      console.error(
        "%c" + message + Validator.printLocation(path, option),
        VALIDATOR_PRINT_STYLE,
      );
    };

    const optionType = Validator.getType(options[option]);
    const refOptionType = refOptionObj[optionType];

    if (refOptionType !== undefined) {
      // if the type is correct, we check if it is supposed to be one of a few select values
      if (
        Validator.getType(refOptionType) === "array" &&
        refOptionType.indexOf(options[option]) === -1
      ) {
        log(
          'Invalid option detected in "' +
            option +
            '".' +
            " Allowed values are:" +
            Validator.print(refOptionType) +
            ' not "' +
            options[option] +
            '". ',
        );
        errorFound = true;
      } else if (optionType === "object" && referenceOption !== "__any__") {
        path = copyAndExtendArray(path, option);
        Validator.parse(
          options[option],
          referenceOptions[referenceOption],
          path,
        );
      }
    } else if (refOptionObj["any"] === undefined) {
      // type of the field is incorrect and the field cannot be any
      log(
        'Invalid type received for "' +
          option +
          '". Expected: ' +
          Validator.print(Object.keys(refOptionObj)) +
          ". Received [" +
          optionType +
          '] "' +
          options[option] +
          '"',
      );
      errorFound = true;
    }
  }

  /**
   *
   * @param {object | boolean | number | string | Array.<number> | Date | Node | Moment | undefined | null} object
   * @returns {string}
   * @static
   */
  static getType(object) {
    const type = typeof object;

    if (type === "object") {
      if (object === null) {
        return "null";
      }
      if (object instanceof Boolean) {
        return "boolean";
      }
      if (object instanceof Number) {
        return "number";
      }
      if (object instanceof String) {
        return "string";
      }
      if (Array.isArray(object)) {
        return "array";
      }
      if (object instanceof Date) {
        return "date";
      }
      if (object.nodeType !== undefined) {
        return "dom";
      }
      if (object._isAMomentObject === true) {
        return "moment";
      }
      return "object";
    } else if (type === "number") {
      return "number";
    } else if (type === "boolean") {
      return "boolean";
    } else if (type === "string") {
      return "string";
    } else if (type === undefined) {
      return "undefined";
    }
    return type;
  }

  /**
   * @param {string} option
   * @param {object} options
   * @param {Array.<string>} path
   * @static
   */
  static getSuggestion(option, options, path) {
    const localSearch = Validator.findInOptions(option, options, path, false);
    const globalSearch = Validator.findInOptions(option, allOptions, [], true);

    const localSearchThreshold = 8;
    const globalSearchThreshold = 4;

    let msg;
    if (localSearch.indexMatch !== undefined) {
      msg =
        " in " +
        Validator.printLocation(localSearch.path, option, "") +
        'Perhaps it was incomplete? Did you mean: "' +
        localSearch.indexMatch +
        '"?\n\n';
    } else if (
      globalSearch.distance <= globalSearchThreshold &&
      localSearch.distance > globalSearch.distance
    ) {
      msg =
        " in " +
        Validator.printLocation(localSearch.path, option, "") +
        "Perhaps it was misplaced? Matching option found at: " +
        Validator.printLocation(
          globalSearch.path,
          globalSearch.closestMatch,
          "",
        );
    } else if (localSearch.distance <= localSearchThreshold) {
      msg =
        '. Did you mean "' +
        localSearch.closestMatch +
        '"?' +
        Validator.printLocation(localSearch.path, option);
    } else {
      msg =
        ". Did you mean one of these: " +
        Validator.print(Object.keys(options)) +
        Validator.printLocation(path, option);
    }

    console.error(
      '%cUnknown option detected: "' + option + '"' + msg,
      VALIDATOR_PRINT_STYLE,
    );
    errorFound = true;
  }

  /**
   * traverse the options in search for a match.
   * @param {string} option
   * @param {object} options
   * @param {Array} path    | where to look for the actual option
   * @param {boolean} [recursive]
   * @returns {{closestMatch: string, path: Array, distance: number}}
   * @static
   */
  static findInOptions(option, options, path, recursive = false) {
    let min = 1e9;
    let closestMatch = "";
    let closestMatchPath = [];
    const lowerCaseOption = option.toLowerCase();
    let indexMatch = undefined;
    for (const op in options) {
      let distance;
      if (options[op].__type__ !== undefined && recursive === true) {
        const result = Validator.findInOptions(
          option,
          options[op],
          copyAndExtendArray(path, op),
        );
        if (min > result.distance) {
          closestMatch = result.closestMatch;
          closestMatchPath = result.path;
          min = result.distance;
          indexMatch = result.indexMatch;
        }
      } else {
        if (op.toLowerCase().indexOf(lowerCaseOption) !== -1) {
          indexMatch = op;
        }
        distance = Validator.levenshteinDistance(option, op);
        if (min > distance) {
          closestMatch = op;
          closestMatchPath = copyArray(path);
          min = distance;
        }
      }
    }
    return {
      closestMatch: closestMatch,
      path: closestMatchPath,
      distance: min,
      indexMatch: indexMatch,
    };
  }

  /**
   * @param {Array.<string>} path
   * @param {object} option
   * @param {string} prefix
   * @returns {string}
   * @static
   */
  static printLocation(path, option, prefix = "Problem value found at: \n") {
    let str = "\n\n" + prefix + "options = {\n";
    for (let i = 0; i < path.length; i++) {
      for (let j = 0; j < i + 1; j++) {
        str += "  ";
      }
      str += path[i] + ": {\n";
    }
    for (let j = 0; j < path.length + 1; j++) {
      str += "  ";
    }
    str += option + "\n";
    for (let i = 0; i < path.length + 1; i++) {
      for (let j = 0; j < path.length - i; j++) {
        str += "  ";
      }
      str += "}\n";
    }
    return str + "\n\n";
  }

  /**
   * @param {object} options
   * @returns {string}
   * @static
   */
  static print(options) {
    return JSON.stringify(options)
      .replace(/(")|(\[)|(\])|(,"__type__")/g, "")
      .replace(/(,)/g, ", ");
  }

  /**
   *  Compute the edit distance between the two given strings
   *  http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#JavaScript
   *
   *  Copyright (c) 2011 Andrei Mackenzie
   *
   *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
   *
   *  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
   *
   *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
   * @param {string} a
   * @param {string} b
   * @returns {Array.<Array.<number>>}}
   * @static
   */
  static levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1,
            ),
          ); // deletion
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
