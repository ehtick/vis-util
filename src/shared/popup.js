/**
 * Popup is a class to create a popup window with some text
 */
export class Popup {
  /**
   * @param {Element} container       The container object.
   * @param {string}  overflowMethod  How the popup should act to overflowing ('flip' or 'cap')
   */
  constructor(container, overflowMethod) {
    this.container = container;
    this.overflowMethod = overflowMethod || "cap";

    this.x = 0;
    this.y = 0;
    this.padding = 5;
    this.hidden = false;

    // create the frame
    this.frame = document.createElement("div");
    this.frame.className = "vis-tooltip";
    this.container.appendChild(this.frame);
  }

  /**
   * @param {number} x   Horizontal position of the popup window
   * @param {number} y   Vertical position of the popup window
   */
  setPosition(x, y) {
    this.x = parseInt(x);
    this.y = parseInt(y);
  }

  /**
   * Set the content for the popup window. This can be HTML code or text.
   * @param {string | Element} content
   */
  setText(content) {
    if (content instanceof Element) {
      while (this.frame.firstChild) {
        this.frame.removeChild(this.frame.firstChild);
      }
      this.frame.appendChild(content);
    } else {
      // String containing literal text, element has to be used for HTML due to
      // XSS risks associated with innerHTML (i.e. prevent XSS by accident).
      this.frame.innerText = content;
    }
  }

  /**
   * Show the popup window
   * @param {boolean} [doShow]    Show or hide the window
   */
  show(doShow) {
    if (doShow === undefined) {
      doShow = true;
    }

    if (doShow === true) {
      const height = this.frame.clientHeight;
      const width = this.frame.clientWidth;
      const maxHeight = this.frame.parentNode.clientHeight;
      const maxWidth = this.frame.parentNode.clientWidth;

      let left = 0,
        top = 0;

      if (this.overflowMethod == "flip") {
        let isLeft = false,
          isTop = true; // Where around the position it's located

        if (this.y - height < this.padding) {
          isTop = false;
        }

        if (this.x + width > maxWidth - this.padding) {
          isLeft = true;
        }

        if (isLeft) {
          left = this.x - width;
        } else {
          left = this.x;
        }

        if (isTop) {
          top = this.y - height;
        } else {
          top = this.y;
        }
      } else {
        top = this.y - height;
        if (top + height + this.padding > maxHeight) {
          top = maxHeight - height - this.padding;
        }
        if (top < this.padding) {
          top = this.padding;
        }

        left = this.x;
        if (left + width + this.padding > maxWidth) {
          left = maxWidth - width - this.padding;
        }
        if (left < this.padding) {
          left = this.padding;
        }
      }

      this.frame.style.left = left + "px";
      this.frame.style.top = top + "px";
      this.frame.style.visibility = "visible";
      this.hidden = false;
    } else {
      this.hide();
    }
  }

  /**
   * Hide the popup window
   */
  hide() {
    this.hidden = true;
    this.frame.style.left = "0";
    this.frame.style.top = "0";
    this.frame.style.visibility = "hidden";
  }

  /**
   * Remove the popup window
   */
  destroy() {
    this.frame.parentNode.removeChild(this.frame); // Remove element from DOM
  }
}
