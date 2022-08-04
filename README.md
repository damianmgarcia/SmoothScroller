# **SmoothScroller**

## **Description**

SmoothScroller is a JavaScript module that provides easy-to-use and customizable smooth scrolling functionality for your website. You can easily change scroll duration and easing, as well as listen for custom events so that your own code can react appropriately to scroll starts and stops. If you would like to see it in action, check out the demos at [damianmgarcia.com](https://damianmgarcia.com).

Also, check out [MomentumScroller](https://github.com/damianmgarcia/MomentumScroller). It is a JavaScript module that provides easy-to-use and customizable momentum scrolling functionality for your website's mouse-users and is designed to work well with SmoothScroller.

## **Features**

- Performs smooth scrolls with custom duration and easing
- Dispatches custom events and returns a promise so your code can easily react

## **Installation**

### [Import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) SmoothScroller:

```javascript
import { SmoothScroller } from "https://damianmgarcia.com/scripts/modules/smooth-scroller.js";
```

## **Usage (Basic)**

Example of smooth scrolling the \<body\> element to a [scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop) of 1000, with a duration of 1.5 seconds, and an easing of "ease-out":

```javascript
SmoothScroller.scroll({
  scrollContainer: document.querySelector("body"),
  y: 1000,
  duration: 1500,
  easing: "ease-out",
});
```

## **Usage (Advanced)**

Below is a list of all static and instance methods.

Method names are bolded and are followed by a description of the method's function.

If a method has parameters, they are listed in order below the method description. Parameter names are italicized, and if they have a default value, they are also italicized, followed by a description of the parameter's function. Some parameters are options objects.

### **Static** Methods:

- **scroll** — Initiates a smooth scroll if the _scrollContainer_ has scrollable area. It returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

  - _Options Object:_
    - _scrollContainer_ — The [Element](https://developer.mozilla.org/en-US/docs/Web/API/Element) to be scrolled.
    - _x_ — _scrollContainer.scrollLeft_ — A [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) indicating the desired [horizontal position](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollLeft) to scroll to.
    - _y_ — _scrollContainer.scrollTop_ — A [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) indicating the desired [vertical position](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop) to scroll to.
    - _duration_ — _600_ — A [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) indicating the desired scroll duration in [milliseconds](https://en.wikipedia.org/wiki/Millisecond).
    - _easing_ — _"ease"_ — A [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) or [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) representing a [Cubic-Bezier easing function](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function). Valid String values include: "ease", "ease-in", "ease-in-out", "ease-out", and "linear". Valid Arrays must be in the form of [P<sub>1</sub>x, P<sub>1</sub>y, P<sub>2</sub>x, P<sub>2</sub>y], and each P value must be a [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type). P<sub>1</sub>x and P<sub>2</sub>x must be within the range [0, 1].
    - _stopScrollOnPointerDown_ — _true_ — A [Boolean](https://developer.mozilla.org/en-US/docs/Glossary/Boolean) that determines how ongoing smooth scrolls react to [pointerdown events](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointerdown_event) on the _scrollContainer_. If set to true, ongoing smooth scrolls will stop if a pointerdown event occurs on the _scrollContainer_. If set to false, ongoing smooth scrolls will not stop if a pointerdown event occurs on the _scrollContainer_.<br><br>

- **getScroller** — Gets and returns a SmoothScroller instance if found, which gives you access to its methods; Otherwise, returns undefined.
  - _scrollContainer_ — The [Element](https://developer.mozilla.org/en-US/docs/Web/API/Element) that has SmoothScroller functionality.<br><br>
- **getAllScrollers** — Gets and returns an [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) of all SmoothScroller instances. The [_forEach_ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) may then be called to perform batch operations.

### **Instance** Methods:

- **getScrollerData** — Gets and returns an [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#objects) containing the following instance properties: scrollContainer, scrolling.

## **Events**

Below is a list of all [CustomEvents](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent) dispatched by SmoothScroller. You can listen for them with the [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) method.

Event names are bolded and are followed by a description of the trigger that leads to their dispatch.

If an event includes custom properties in the [CustomEvent details object](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail), they are listed below the event description. Custom property names are italicized and are followed by a description.

### **Instance** Events:

- **smoothScrollerStart** — Dispatches at the beginning of a smooth scroll
  - _scrollContainer_ — The SmoothScroller instance's scroll container
  - _startPoint_ — The starting coordinates
  - _endPoint_ — The ending coordinates
  - _distance_ — The distance scrolled
  - _duration_ — The calculated duration of the scroll
  - _elapsedTime_ — The elapsed time of the scroll, which will be less than the calculated duration if the scroll was interrupted
  - _interruptedBy_ — The cause of a scroll's interruption if it was interrupted; Otherwise, null<br><br>
- **smoothScrollerScroll** — Dispatches continuously while smooth scrolling
  - Same as smoothScrollerStart<br><br>
- **smoothScrollerStop** — Dispatches at the end of a smooth scroll
  - Same as smoothScrollerStart<br><br>

## **Promises**

The static scroll method returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves upon scroll completion. The promise includes the same data as the above event data. [Awaiting](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) the promise is the easiest way to react to the result of a smooth scroll.
