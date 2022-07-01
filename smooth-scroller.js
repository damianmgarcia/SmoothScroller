import {
  getBrowserHeuristics,
  validateArgument,
} from "https://damianmgarcia.com/scripts/modules/utilities.js";

const browserHeuristics = getBrowserHeuristics();

class SmoothScroller {
  static scrollerMap = new Map();
  static scroll({
    scrollContainer,
    x,
    y,
    duration,
    easing,
    stopScrollOnPointerDown,
  } = {}) {
    const matchingScroller = this.scrollerMap.get(scrollContainer);

    const scroller = matchingScroller
      ? matchingScroller
      : new this(scrollContainer);

    return scroller.scroll({
      x,
      y,
      duration,
      easing,
      stopScrollOnPointerDown,
    });
  }

  #scrollContainer;

  constructor(scrollContainer) {
    validateArgument("scrollContainer", scrollContainer, {
      allowedPrototypes: [Element],
    });

    if (SmoothScroller.scrollerMap.has(scrollContainer))
      throw new Error(
        "A SmoothScroller instance for this scrollContainer already exists"
      );

    this.#scrollContainer = scrollContainer;

    this.#scrollContainer.addEventListener("pointerdown", (event) => {
      event.target.setPointerCapture(event.pointerId);
      if (this.#stopScrollOnPointerDown && this.#resolve)
        this.abortPriorScrolls({
          interruptedBy: "Pointer down on scroll container",
        });

      const smoothScrollPointerDownEvent = new CustomEvent(
        "smoothScrollPointerDown",
        {
          bubbles: true,
          cancelable: true,
          detail: this.getEventData(),
        }
      );
      this.#scrollContainer.dispatchEvent(smoothScrollPointerDownEvent);
    });

    this.#scrollContainer.addEventListener("pointerup", () => {
      const smoothScrollPointerUpEvent = new CustomEvent(
        "smoothScrollPointerUp",
        {
          bubbles: true,
          cancelable: true,
          detail: this.getEventData(),
        }
      );
      this.#scrollContainer.dispatchEvent(smoothScrollPointerUpEvent);
    });

    this.#scrollContainer.addEventListener("pointercancel", () => {
      const smoothScrollPointerUpEvent = new CustomEvent(
        "smoothScrollPointerUp",
        {
          bubbles: true,
          cancelable: true,
          detail: this.getEventData(),
        }
      );
      this.#scrollContainer.dispatchEvent(smoothScrollPointerUpEvent);
    });

    SmoothScroller.scrollerMap.set(scrollContainer, this);
  }

  get scrollContainer() {
    return this.#scrollContainer;
  }

  #isScrolling = false;

  get isScrolling() {
    return this.#isScrolling;
  }

  #cubicBezierSolver;
  #stopScrollOnPointerDown;
  #scrollDistanceX;
  #scrollDistanceY;
  #scrollRafId;
  #scrollStartingPointX;
  #scrollStartingPointY;
  #startTime;
  #duration;
  #elapsedTime;
  #resolve;

  async scroll(
    {
      x = this.#scrollContainer.scrollLeft,
      y = this.#scrollContainer.scrollTop,
      duration = 600,
      easing = "ease",
      stopScrollOnPointerDown = true,
    } = {},
    currentTime = NaN
  ) {
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

      validateArgument("stopScrollOnPointerDown", stopScrollOnPointerDown, {
        allowedTypes: ["boolean"],
      });

      if (typeof easing === "string") {
        easing = CubicBezierSolver.easingKeywordMap.get(easing);
      }

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

      if (this.#resolve)
        this.abortPriorScrolls({ interruptedBy: "New smooth scroll" });

      if (browserHeuristics.isIOsSafari) {
        this.#scrollContainer.style.setProperty("overflow", "hidden");
      } // Stops Safari's momentum scrolling to prevent scroll interference

      this.#isScrolling = true;
      this.#stopScrollOnPointerDown = stopScrollOnPointerDown;
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
          this.#resolve = resolve;
          return this.abortPriorScrolls();
        });
      } else if (absoluteScrollDistanceX >= 1 || absoluteScrollDistanceY >= 1) {
        this.#duration = duration;

        if (duration <= 0) {
          this.#scrollContainer.scrollTo(limitCorrectedX, limitCorrectedY);
          return new Promise((resolve) => {
            this.#resolve = resolve;
            return this.abortPriorScrolls();
          });
        } else if (duration > 0) {
          return new Promise((resolve) => {
            this.#resolve = resolve;
            this.#scrollRafId = requestAnimationFrame((currentTime) => {
              this.scroll(
                {
                  x,
                  y,
                  duration,
                  easing,
                },
                currentTime
              );
            });
          });
        }
      }
    }

    if (!this.#startTime) {
      this.#startTime = currentTime;

      const smoothScrollStartEvent = new CustomEvent("smoothScrollStart", {
        bubbles: true,
        cancelable: true,
        detail: this.getEventData(),
      });
      this.#scrollContainer.dispatchEvent(smoothScrollStartEvent);
    }

    this.#elapsedTime = currentTime - this.#startTime;
    const elapsedTimeRatio = Math.min(this.#elapsedTime / duration, 1);

    const scrollRatio = this.#cubicBezierSolver.solve(
      elapsedTimeRatio,
      1 / (200 * duration)
    );

    if (this.#scrollDistanceX) {
      const nextScrollX =
        this.#scrollStartingPointX + scrollRatio * this.#scrollDistanceX;
      this.#scrollContainer.scrollLeft = nextScrollX;
    }

    if (this.#scrollDistanceY) {
      const nextScrollY =
        this.#scrollStartingPointY + scrollRatio * this.#scrollDistanceY;
      this.#scrollContainer.scrollTop = nextScrollY;
    }

    const smoothScrollEvent = new CustomEvent("smoothScroll", {
      bubbles: true,
      cancelable: true,
      detail: this.getEventData(),
    });
    this.#scrollContainer.dispatchEvent(smoothScrollEvent);

    if (elapsedTimeRatio < 1) {
      this.#isScrolling = true;
      this.#scrollRafId = requestAnimationFrame((currentTime) => {
        this.scroll(
          {
            x,
            y,
            duration,
            easing,
            stopScrollOnPointerDown,
          },
          currentTime
        );
      });
    } else if (elapsedTimeRatio >= 1) {
      return this.abortPriorScrolls();
    }
  }

  abortPriorScrolls(extraData = {}) {
    if (this.#resolve) this.#resolve(this.getEventData(extraData));

    const smoothScrollStopEvent = new CustomEvent("smoothScrollStop", {
      bubbles: true,
      cancelable: true,
      detail: this.getEventData(extraData),
    });
    this.#scrollContainer.dispatchEvent(smoothScrollStopEvent);

    if (browserHeuristics.isIOsSafari) {
      this.#scrollContainer.style.removeProperty("overflow");
    }

    cancelAnimationFrame(this.#scrollRafId);
    this.#scrollStartingPointX = null;
    this.#scrollStartingPointY = null;
    this.#scrollDistanceX = null;
    this.#scrollDistanceY = null;
    this.#startTime = null;
    this.#duration = null;
    this.#elapsedTime = null;
    this.#resolve = null;
    this.#isScrolling = false;
  }

  getEventData(extraData) {
    const eventData = {
      interruptedBy: null,
      startPoint: [this.#scrollStartingPointX, this.#scrollStartingPointY],
      endPoint: [
        this.#scrollContainer.scrollLeft,
        this.#scrollContainer.scrollTop,
      ],
      distance: Math.hypot(
        Math.abs(this.#scrollStartingPointX - this.#scrollContainer.scrollLeft),
        Math.abs(this.#scrollStartingPointY - this.#scrollContainer.scrollTop)
      ),
      duration: this.#duration,
      elapsedTime: this.#elapsedTime,
      scrollContainer: this.#scrollContainer,
      smoothScroller: this,
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
    const validatedControlPoints = easingValidator(controlPoints);
    const [p1x, p1y, p2x, p2y] = validatedControlPoints;

    this.#controlPoints = {
      p1x: p1x,
      p1y: p1y,
      p2x: p2x,
      p2y: p2y,
    };

    this.#cx = 3.0 * p1x;
    this.#bx = 3.0 * (p2x - p1x) - this.#cx;
    this.#ax = 1.0 - this.#cx - this.#bx;

    this.#cy = 3.0 * p1y;
    this.#by = 3.0 * (p2y - p1y) - this.#cy;
    this.#ay = 1.0 - this.#cy - this.#by;

    function easingValidator(easing) {
      validateArgument("easing", easing, {
        allowedTypes: ["string", "array"],
      });

      if (typeof easing === "string") {
        validateArgument("easing", easing, {
          allowedValues: Array.from(CubicBezierSolver.easingKeywordMap.keys()),
        });
        easing = CubicBezierSolver.easingKeywordMap.get(easing);
      } else if (Array.isArray(easing)) {
        validateArgument("easing", easing.length, {
          allowedValues: [4],
          customErrorMessage:
            "easing must comprise 4 numbers, e.g. [ 0, 0.25, 0.1, 0.25]",
        });
        easing.forEach((controlPoint) =>
          validateArgument("easing values", controlPoint, {
            allowedTypes: ["number"],
          })
        );
        validateArgument("x1", easing[0], {
          allowedMin: 0,
          allowedMax: 1,
        });
        validateArgument("x2", easing[2], {
          allowedMin: 0,
          allowedMax: 1,
        });

        // Prevent precision loss through y-value limitation; no BigInts
        easing[1] = yLimiter(easing[1]);
        easing[3] = yLimiter(easing[3]);

        function yLimiter(y) {
          const limit = Math.floor(Number.MAX_SAFE_INTEGER / 6);
          return Math.abs(y) < limit ? y : limit;
        }
      }

      return easing;
    }
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
