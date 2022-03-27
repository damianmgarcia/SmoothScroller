const browserHeuristics = getBrowserHeuristics();

class SmoothScroller {
  static allSmoothScrollers = [];
  static pointerIsDown;

  #cubicBezierSolver;
  #scrollContainer;
  #defaultScrollDuration;
  #defaultScrollEasing;
  #stopScrollOnPointerDown;
  #onSmoothScrollPointerDown;
  #onSmoothScrollPointerUp;
  #onSmoothScrollStart;
  #onSmoothScroll;
  #onSmoothScrollStop;

  constructor(
    scrollContainer,
    {
      defaultScrollDuration = 600,
      defaultScrollEasing = [0.25, 0.1, 0.25, 1],
      stopScrollOnPointerDown = true,
      onSmoothScrollPointerDown,
      onSmoothScrollPointerUp,
      onSmoothScrollStart,
      onSmoothScroll,
      onSmoothScrollStop,
    } = {}
  ) {
    if (!(scrollContainer instanceof Element))
      throw new TypeError("scrollContainer must be an instance of Element");

    if (!Number.isFinite(defaultScrollDuration))
      throw new TypeError("scrollDuration must be a finite number");

    if (typeof stopScrollOnPointerDown != "boolean")
      throw new TypeError("stopScrollOnPointerDown must be of type boolean");

    if (
      (onSmoothScrollPointerDown &&
        typeof onSmoothScrollPointerDown != "function") ||
      (onSmoothScrollPointerUp &&
        typeof onSmoothScrollPointerUp != "function") ||
      (onSmoothScrollStart && typeof onSmoothScrollStart != "function") ||
      (onSmoothScroll && typeof onSmoothScroll != "function") ||
      (onSmoothScrollStop && typeof onSmoothScrollStop != "function")
    )
      throw new TypeError("Callback must be of type function");

    this.#scrollContainer = scrollContainer;
    this.#defaultScrollDuration = defaultScrollDuration;
    this.#cubicBezierSolver = new CubicBezierSolver(defaultScrollEasing);
    this.#defaultScrollEasing = defaultScrollEasing;
    this.#stopScrollOnPointerDown = stopScrollOnPointerDown;
    this.#onSmoothScrollPointerDown = onSmoothScrollPointerDown;
    this.#onSmoothScrollPointerUp = onSmoothScrollPointerUp;
    this.#onSmoothScrollStart = onSmoothScrollStart;
    this.#onSmoothScroll = onSmoothScroll;
    this.#onSmoothScrollStop = onSmoothScrollStop;

    this.#scrollContainer.addEventListener("pointerdown", (event) => {
      if (SmoothScroller.pointerIsDown) return;
      SmoothScroller.pointerIsDown = true;
      event.target.setPointerCapture(event.pointerId);
      if (this.#stopScrollOnPointerDown)
        this.abortPriorScrolls({
          abortedBy: "Pointer down on scroll container",
        });
      if (this.#onSmoothScrollPointerDown)
        this.#onSmoothScrollPointerDown(
          this.getEventData({
            eventType: "onSmoothScrollPointerDown",
          })
        );
    });

    this.#scrollContainer.addEventListener("pointerup", () => {
      SmoothScroller.pointerIsDown = false;
      if (this.#onSmoothScrollPointerUp)
        this.#onSmoothScrollPointerUp(
          this.getEventData({
            eventType: "onSmoothScrollPointerUp",
          })
        );
    });

    this.#scrollContainer.addEventListener("pointercancel", () => {
      SmoothScroller.pointerIsDown = false;
      if (this.#onSmoothScrollPointerUp)
        this.#onSmoothScrollPointerUp(
          this.getEventData({
            eventType: "onSmoothScrollPointerUp",
          })
        );
    });

    SmoothScroller.allSmoothScrollers.push(this);
  }

  get scrollContainer() {
    return this.#scrollContainer;
  }

  #isCurrentlyScrolling = false;

  get isCurrentlyScrolling() {
    return this.#isCurrentlyScrolling;
  }

  #scrollDistanceX;
  #scrollDistanceY;
  #scrollRafId;
  #scrollStartingPointX;
  #scrollStartingPointY;
  #startTime;
  #duration;
  #elapsedTime;
  #resolve;

  async smoothScrollTo(
    {
      x = this.#scrollContainer.scrollLeft,
      y = this.#scrollContainer.scrollLeft,
      duration = this.#defaultScrollDuration,
      easing = this.#defaultScrollEasing,
    } = {},
    newSmoothScroll = true,
    currentTime
  ) {
    if (newSmoothScroll) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        this.abortPriorScrolls({ abortedBy: "New smooth scroll" });
        return new Promise((resolve) => {
          this.#resolve = resolve;
          return this.abortPriorScrolls({
            abortedBy: "TypeError: X and Y must be finite numbers",
          });
        });
      }

      this.abortPriorScrolls({ abortedBy: "New smooth scroll" });

      const smoothScrollEvent = new CustomEvent("smoothscroll");
      this.#scrollContainer.dispatchEvent(smoothScrollEvent); // MomentumScroller.js listens to and stops scrolls on this event to prevent scroll interference

      if (browserHeuristics.isIOsSafari) {
        this.#scrollContainer.style.setProperty("overflow", "hidden");
      } // Stops Safari's momentum scrolling to prevent scroll interference

      this.#isCurrentlyScrolling = true;

      if (typeof easing == "string") {
        const keyword = easing;
        easing = CubicBezierSolver.getControlPointsFromKeyword(keyword);
      }

      const controlPointsMatchCurrentControlPoints =
        this.#cubicBezierSolver.controlPointsMatchCurrentControlPoints(
          ...easing
        );
      if (!controlPointsMatchCurrentControlPoints)
        this.#cubicBezierSolver = new CubicBezierSolver(easing);

      this.#scrollStartingPointX = this.#scrollContainer.scrollLeft;
      this.#scrollStartingPointY = this.#scrollContainer.scrollTop;

      const limitCorrectedX =
        x < 0
          ? 0
          : x >
            this.#scrollContainer.scrollWidth -
              this.#scrollContainer.clientWidth
          ? this.#scrollContainer.scrollWidth -
            this.#scrollContainer.clientWidth
          : x;
      const limitCorrectedY =
        y < 0
          ? 0
          : y >
            this.#scrollContainer.scrollHeight -
              this.#scrollContainer.clientHeight
          ? this.#scrollContainer.scrollHeight -
            this.#scrollContainer.clientHeight
          : y;

      this.#scrollDistanceX = limitCorrectedX - this.#scrollStartingPointX;
      this.#scrollDistanceY = limitCorrectedY - this.#scrollStartingPointY;
      this.#duration = duration;

      if (
        Math.abs(this.#scrollDistanceX) < 1 &&
        Math.abs(this.#scrollDistanceY) < 1
      ) {
        return new Promise((resolve) => {
          this.#resolve = resolve;
          return this.abortPriorScrolls({
            abortedBy: "X and Y scroll distance < 1",
          });
        });
      } else if (
        Math.abs(this.#scrollDistanceX) >= 1 ||
        Math.abs(this.#scrollDistanceY) >= 1
      ) {
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
              this.smoothScrollTo(
                {
                  x,
                  y,
                  duration,
                  easing,
                },
                false,
                currentTime
              );
            });
          });
        }
      }
    }

    if (!this.#startTime) {
      this.#startTime = currentTime;
      if (this.#onSmoothScrollStart)
        this.#onSmoothScrollStart(
          this.getEventData({ eventType: "onSmoothScrollStart" })
        );
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

    if (this.#onSmoothScroll)
      this.#onSmoothScroll(this.getEventData({ eventType: "onSmoothScroll" }));

    if (elapsedTimeRatio < 1) {
      this.#isCurrentlyScrolling = true;
      this.#scrollRafId = requestAnimationFrame((currentTime) => {
        this.smoothScrollTo(
          {
            x,
            y,
            duration,
            easing,
          },
          false,
          currentTime
        );
      });
    } else if (elapsedTimeRatio >= 1) {
      return this.abortPriorScrolls();
    }
  }

  abortPriorScrolls(extraData = {}) {
    if (this.#resolve) this.#resolve(this.getEventData(extraData));

    if (this.#onSmoothScrollStop)
      this.#onSmoothScrollStop(
        this.getEventData(
          Object.assign(extraData, { eventType: "onSmoothScrollStop" })
        )
      );

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
    this.#isCurrentlyScrolling = false;
  }

  getEventData(extraData) {
    const eventData = {
      abortedBy: null,
      x: this.#scrollContainer.scrollLeft,
      y: this.#scrollContainer.scrollTop,
      duration: this.#duration,
      elapsedTime: this.#elapsedTime,
      scrollContainer: this.#scrollContainer,
      smoothScroller: this,
    };

    if (extraData && typeof extraData == "object")
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
  static getControlPointsFromKeyword(keyword) {
    if (keyword == "ease") {
      return [0.25, 0.1, 0.25, 1];
    } else if (keyword == "ease-in") {
      return [0.42, 0, 1, 1];
    } else if (keyword == "ease-out") {
      return [0, 0, 0.58, 1];
    } else if (keyword == "ease-in-out") {
      return [0.42, 0, 0.58, 1];
    } else if (keyword == "linear") {
      return [0, 0, 1, 1];
    } else {
      throw new Error("Non-standard cubic-bezier function keyword");
    }
  }

  #controlPoints;
  #ax;
  #bx;
  #cx;
  #ay;
  #by;
  #cy;

  constructor(controlPoints) {
    const validatedControlPoints = cubicBezierControlPointValidator();

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

    function cubicBezierControlPointValidator() {
      if (!controlPoints) throw new TypeError("No control points");

      if (typeof controlPoints == "string") {
        const keyword = controlPoints;
        controlPoints = CubicBezierSolver.getControlPointsFromKeyword(keyword);
      } else if (Array.isArray(controlPoints)) {
        if (controlPoints.length != 4)
          throw new Error("controlPoints must include 4 control points");

        if (
          controlPoints.some(
            (item) => typeof item != "number" || !Number.isFinite(item)
          )
        )
          throw new TypeError("Control points must be finite numbers");

        if (
          controlPoints[0] < 0 ||
          controlPoints[0] > 1 ||
          controlPoints[2] < 0 ||
          controlPoints[2] > 1
        )
          throw new RangeError(
            "x1 and x2 control points must be within the range [0, 1]"
          );
      } else {
        throw new TypeError(
          "controlPoints must be of type array or a standard easing keyword of type string"
        );
      }

      return controlPoints;
    }
  }

  controlPointsMatchCurrentControlPoints(p1x, p1y, p2x, p2y) {
    return (
      p1x == this.#controlPoints.p1x &&
      p1y == this.#controlPoints.p1y &&
      p2x == this.#controlPoints.p2x &&
      p2y == this.#controlPoints.p2y
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
    if (x < 0 || x > 1) throw new Error("x must be within range [0, 1]");

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

function getBrowserHeuristics() {
  const userAgent = navigator.userAgent.toLowerCase();

  const isChromium =
    navigator?.userAgentData?.brands.some(
      (brandInformation) => brandInformation.brand == "Chromium"
    ) || /Chrome\/[.0-9]*/.test(navigator.userAgent);

  const isSafari =
    !isChromium &&
    userAgent.includes("applewebkit/") &&
    !userAgent.includes("chrome/") &&
    !userAgent.includes("firefox/") &&
    !userAgent.includes("edg/") &&
    !userAgent.includes("opr/");

  const isIOsSafari =
    isSafari &&
    (navigator?.standalone === true || navigator?.standalone === false);

  const browserHeuristics = {
    isChromium: isChromium,
    isSafari: isSafari,
    isIOsSafari: isIOsSafari,
  };

  return browserHeuristics;
}

export { SmoothScroller };
