import {
  getBrowserHeuristics,
  validateArgument,
} from "https://damianmgarcia.com/scripts/modules/utilities.js";

const browserHeuristics = getBrowserHeuristics();
const smoothScrollerKey = Symbol("smoothScrollerKey");

class SmoothScroller {
  static #scrollerMap = new Map();

  static scroll({
    scrollContainer,
    x,
    y,
    duration,
    easing,
    stopScrollingOnPointerDown,
  } = {}) {
    const matchingScroller = this.#scrollerMap.get(scrollContainer);

    const createScroller = (scrollContainer) => {
      validateArgument("scrollContainer", scrollContainer, {
        allowedPrototypes: [Element],
      });

      const scroller = new this(scrollContainer, smoothScrollerKey);

      this.#scrollerMap.set(scrollContainer, scroller);

      return scroller;
    };

    const scroller = matchingScroller
      ? matchingScroller
      : createScroller(scrollContainer);

    return scroller.#scroll({
      x,
      y,
      duration,
      easing,
      stopScrollingOnPointerDown,
    });
  }

  static getScroller(scrollContainer) {
    return this.#scrollerMap.get(scrollContainer);
  }

  static getAllScrollers() {
    return Array.from(this.#scrollerMap.values());
  }

  #scrollContainer;

  constructor(scrollContainer, key) {
    validateArgument("key", key, {
      allowedValues: [smoothScrollerKey],
      customErrorMessage:
        "Please use the SmoothScroller.scroll static method to scroll",
    });

    this.#scrollContainer = scrollContainer;

    this.#scrollContainer.classList.add("smooth-scroller");

    this.#scrollContainer.addEventListener("pointerdown", () => {
      if (this.#scrollResolve && this.#stopScrollingOnPointerDown)
        this.#stopScroll({
          interruptedBy: "Pointer down on scroll container",
        });
    });
  }

  getScrollerData() {
    return {
      scrollContainer: this.#scrollContainer,
      scrolling: this.#scrolling,
    };
  }

  #cubicBezierSolver;
  #scrolling = false;
  #stopScrollingOnPointerDown;
  #scrollDistanceX = NaN;
  #scrollDistanceY = NaN;
  #scrollDuration = NaN;
  #scrollElapsedTime = NaN;
  #scrollEndingPointX = NaN;
  #scrollEndingPointY = NaN;
  #scrollRafId;
  #scrollResolve;
  #scrollStartingPointX = NaN;
  #scrollStartingPointY = NaN;
  #scrollStartTime = NaN;

  async #scroll({
    x = this.#scrollContainer.scrollLeft,
    y = this.#scrollContainer.scrollTop,
    duration = 600,
    easing = "ease",
    stopScrollingOnPointerDown = true,
    currentTime = NaN,
  } = {}) {
    const isNewScroll = Number.isNaN(currentTime);
    if (isNewScroll) {
      validateArgument("x", x, {
        allowedTypes: ["number"],
      });

      validateArgument("y", y, {
        allowedTypes: ["number"],
      });

      validateArgument("duration", duration, {
        allowedTypes: ["number"],
        allowedMin: 0,
        allowFiniteNumbersOnly: true,
      });

      validateArgument(
        "stopScrollingOnPointerDown",
        stopScrollingOnPointerDown,
        {
          allowedTypes: ["boolean"],
        }
      );

      if (typeof easing === "string")
        easing = CubicBezierSolver.easingKeywordMap.get(easing);

      if (!this.#cubicBezierSolver) {
        this.#cubicBezierSolver = new CubicBezierSolver(easing);
      } else if (this.#cubicBezierSolver) {
        const controlPointsMatchCurrentControlPoints =
          this.#cubicBezierSolver.controlPointsMatchCurrentControlPoints(
            ...easing
          );
        if (!controlPointsMatchCurrentControlPoints)
          this.#cubicBezierSolver = new CubicBezierSolver(easing);
      }

      if (this.#scrollResolve)
        this.#stopScroll({ interruptedBy: "New smooth scroll" });

      if (browserHeuristics.isIOsSafari)
        this.#scrollContainer.style.setProperty("overflow", "hidden"); // Stops Safari's momentum scrolling to prevent scroll interference

      this.#stopScrollingOnPointerDown = stopScrollingOnPointerDown;
      this.#scrollStartingPointX = this.#scrollContainer.scrollLeft;
      this.#scrollStartingPointY = this.#scrollContainer.scrollTop;

      const leftEdge = 0;
      const rightEdge =
        this.#scrollContainer.scrollWidth - this.#scrollContainer.clientWidth;
      const limitCorrectedX =
        x < leftEdge ? leftEdge : x > rightEdge ? rightEdge : x;

      const topEdge = 0;
      const bottomEdge =
        this.#scrollContainer.scrollHeight - this.#scrollContainer.clientHeight;
      const limitCorrectedY =
        y < topEdge ? topEdge : y > bottomEdge ? bottomEdge : y;

      this.#scrollDistanceX = limitCorrectedX - this.#scrollStartingPointX;
      this.#scrollDistanceY = limitCorrectedY - this.#scrollStartingPointY;

      const absoluteScrollDistanceX = Math.abs(this.#scrollDistanceX);
      const absoluteScrollDistanceY = Math.abs(this.#scrollDistanceY);
      if (absoluteScrollDistanceX < 1 && absoluteScrollDistanceY < 1) {
        return new Promise((resolve) => {
          this.#scrollResolve = resolve;
          return this.#stopScroll();
        });
      } else if (absoluteScrollDistanceX >= 1 || absoluteScrollDistanceY >= 1) {
        this.#scrollDuration = duration;

        if (this.#scrollDuration <= 0) {
          this.#scrollContainer.scrollTo(limitCorrectedX, limitCorrectedY);
          return new Promise((resolve) => {
            this.#scrollResolve = resolve;
            return this.#stopScroll();
          });
        } else if (this.#scrollDuration > 0) {
          return new Promise((resolve) => {
            this.#scrollResolve = resolve;
            this.#scrollRafId = requestAnimationFrame((currentTime) => {
              this.#scroll({
                currentTime,
              });
            });
          });
        }
      }
    }

    if (!this.#scrollStartTime) {
      this.#scrollStartTime = currentTime;
      this.#scrolling = true;

      this.#scrollContainer.dispatchEvent(
        new CustomEvent("smoothScrollerScrollStart", {
          bubbles: true,
          cancelable: true,
          detail: this.#getScrollEventData(),
        })
      );
    }

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("smoothScrollerScroll", {
        bubbles: true,
        cancelable: true,
        detail: this.#getScrollEventData(),
      })
    );

    this.#scrollElapsedTime = currentTime - this.#scrollStartTime;
    const elapsedTimeRatio = Math.min(
      this.#scrollElapsedTime / this.#scrollDuration,
      1
    );

    const scrollRatio = this.#cubicBezierSolver.solve(
      elapsedTimeRatio,
      1 / (200 * this.#scrollDuration)
    );

    const getNextScrollPosition = (startingPoint, scrollDistance) =>
      startingPoint + scrollRatio * scrollDistance;

    if (this.#scrollDistanceX) {
      const nextScrollLeft = getNextScrollPosition(
        this.#scrollStartingPointX,
        this.#scrollDistanceX
      );
      this.#scrollContainer.scrollLeft = nextScrollLeft;
    }

    if (this.#scrollDistanceY) {
      const nextScrollTop = getNextScrollPosition(
        this.#scrollStartingPointY,
        this.#scrollDistanceY
      );
      this.#scrollContainer.scrollTop = nextScrollTop;
    }

    this.#scrollEndingPointX = this.#scrollContainer.scrollLeft;
    this.#scrollEndingPointY = this.#scrollContainer.scrollTop;

    if (elapsedTimeRatio < 1) {
      this.#scrollRafId = requestAnimationFrame((currentTime) => {
        this.#scroll({
          currentTime,
        });
      });
    } else if (elapsedTimeRatio >= 1) {
      return this.#stopScroll();
    }
  }

  #stopScroll(extraData = {}) {
    const eventData = this.#getScrollEventData(extraData);

    this.#scrollResolve(eventData);

    this.#scrollContainer.dispatchEvent(
      new CustomEvent("smoothScrollerScrollStop", {
        bubbles: true,
        cancelable: true,
        detail: eventData,
      })
    );

    if (browserHeuristics.isIOsSafari)
      this.#scrollContainer.style.removeProperty("overflow");

    cancelAnimationFrame(this.#scrollRafId);
    this.#scrolling = false;
    this.#scrollDistanceX = NaN;
    this.#scrollDistanceY = NaN;
    this.#scrollDuration = NaN;
    this.#scrollElapsedTime = NaN;
    this.#scrollEndingPointX = NaN;
    this.#scrollEndingPointY = NaN;
    this.#scrollResolve = null;
    this.#scrollStartingPointX = NaN;
    this.#scrollStartingPointY = NaN;
    this.#scrollStartTime = NaN;
  }

  #getScrollEventData(extraData) {
    const eventData = {
      scrollContainer: this.#scrollContainer,
      startPoint: [this.#scrollStartingPointX, this.#scrollStartingPointY],
      endPoint: [this.#scrollEndingPointX, this.#scrollEndingPointY],
      distance: Math.hypot(
        Math.abs(this.#scrollStartingPointX - this.#scrollEndingPointX),
        Math.abs(this.#scrollStartingPointY - this.#scrollEndingPointY)
      ),
      duration: this.#scrollDuration,
      elapsedTime: this.#scrollElapsedTime,
      interruptedBy: null,
    };

    if (extraData && typeof extraData === "object")
      Object.assign(eventData, extraData);

    return eventData;
  }
}

/* class CubicBezierSolver ported from WebKit:
 * https://github.com/WebKit/WebKit/blob/8afe31a018b11741abdf9b4d5bb973d7c1d9ff05/Source/WebCore/platform/graphics/UnitBezier.h
 *
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
class CubicBezierSolver {
  static easingKeywordMap = new Map([
    ["ease", [0.25, 0.1, 0.25, 1]],
    ["ease-in", [0.42, 0, 1, 1]],
    ["ease-out", [0, 0, 0.58, 1]],
    ["ease-in-out", [0.42, 0, 0.58, 1]],
    ["linear", [0, 0, 1, 1]],
  ]);

  #controlPoints;
  #ax;
  #bx;
  #cx;
  #ay;
  #by;
  #cy;

  constructor(controlPoints) {
    const controlPointValidator = () => {
      validateArgument("controlPoints", controlPoints, {
        allowedTypes: ["string", "array"],
      });

      if (typeof controlPoints === "string") {
        validateArgument("controlPoints", controlPoints, {
          allowedValues: Array.from(CubicBezierSolver.easingKeywordMap.keys()),
        });
        controlPoints = CubicBezierSolver.easingKeywordMap.get(controlPoints);
      } else if (Array.isArray(controlPoints)) {
        validateArgument("controlPoints", controlPoints.length, {
          allowedValues: [4],
          customErrorMessage:
            "controlPoints must comprise 4 numbers, e.g. [ 0, 0.25, 0.1, 0.25]",
        });
        controlPoints.forEach((controlPoint) =>
          validateArgument("controlPoints values", controlPoint, {
            allowedTypes: ["number"],
          })
        );
        validateArgument("x1", controlPoints[0], {
          allowedMin: 0,
          allowedMax: 1,
        });
        validateArgument("x2", controlPoints[2], {
          allowedMin: 0,
          allowedMax: 1,
        });

        // Prevent precision loss through y-value limitation; no BigInts
        const yLimiter = (y) => {
          const limit = Math.floor(Number.MAX_SAFE_INTEGER / 6);
          return Math.abs(y) < limit ? y : limit;
        };

        controlPoints[1] = yLimiter(controlPoints[1]);
        controlPoints[3] = yLimiter(controlPoints[3]);
      }

      return controlPoints;
    };

    const validatedControlPoints = controlPointValidator();
    const [p1x, p1y, p2x, p2y] = validatedControlPoints;

    this.#controlPoints = {
      p1x,
      p1y,
      p2x,
      p2y,
    };

    this.#cx = 3.0 * p1x;
    this.#bx = 3.0 * (p2x - p1x) - this.#cx;
    this.#ax = 1.0 - this.#cx - this.#bx;

    this.#cy = 3.0 * p1y;
    this.#by = 3.0 * (p2y - p1y) - this.#cy;
    this.#ay = 1.0 - this.#cy - this.#by;
  }

  controlPointsMatchCurrentControlPoints(p1x, p1y, p2x, p2y) {
    return (
      p1x === this.#controlPoints.p1x &&
      p1y === this.#controlPoints.p1y &&
      p2x === this.#controlPoints.p2x &&
      p2y === this.#controlPoints.p2y
    );
  }

  sampleCurveX(t) {
    return ((this.#ax * t + this.#bx) * t + this.#cx) * t;
  }

  sampleCurveY(t) {
    return ((this.#ay * t + this.#by) * t + this.#cy) * t;
  }

  sampleCurveDerivativeX(t) {
    return (3.0 * this.#ax * t + 2.0 * this.#bx) * t + this.#cx;
  }

  solveCurveX(x, epsilon) {
    validateArgument("x", x, {
      allowedTypes: ["number"],
      allowedMin: 0,
      allowedMax: 1,
    });

    // Newton's
    let t0, t1, t2, x2, d2;
    for (let i = 0, t2 = x; i < 8; i++) {
      x2 = this.sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = this.sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }

    // Bisection if Newton's fails
    t0 = 0;
    t1 = 1;
    t2 = x;
    while (t0 < t1) {
      x2 = this.sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) {
        t0 = t2;
      } else {
        t1 = t2;
      }
      t2 = (t1 - t0) * 0.5 + t0;
    }

    // Failed
    return t2;
  }

  solve(x, epsilon) {
    return this.sampleCurveY(this.solveCurveX(x, epsilon));
  }
}

export { SmoothScroller };
