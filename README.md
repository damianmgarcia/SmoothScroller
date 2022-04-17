# **SmoothScroller**

## **Description**

SmoothScroller is a JavaScript module that provides advanced, easy-to-use smooth scrolling functionality for your website. It allows you to customize smooth scrolling properties, such as duration and easing, to create a more delightful experience for your users. Additionally, it includes advanced features such as scroll events and promises. If you would like to see it in action, check out the demos at [damianmgarcia.com](https://damianmgarcia.com).

## **Features**

- Customizable Scroll Duration
- Customizable Scroll Easing
- Events
- Promise-Based

## **Installation**

### [Import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) the SmoothScroller module:

```javascript
import { SmoothScroller } from "https://damianmgarcia.com/scripts/modules/smooth-scroller.js";
```

## **Scrolling**

### Scroll Methods:

```javascript
// Static method (implicit instantiation of new SmoothScroller)
SmoothScroller.scroll({
  scrollContainer: document.querySelector("body"),
  ...scrollOptions,
});

// Instance method (explicit instantiation of new SmoothScroller)
const smoothScrollerInstance = new SmoothScroller(
  document.querySelector("body")
);
smoothScrollerInstance.scroll({
  ...scrollOptions,
});
```

### Scroll Options:

- **x** — _number_ — The desired horizontal position of the scroll container _(default: scrollContainer.scrollLeft)_
- **y** — _number_ — The desired vertical position of the scroll container _(default: scrollContainer.scrollTop)_
- **duration** — _number_ — The desired scroll duration in milliseconds _(default: 600)_
- **easing** — _string | array_ — The desired scroll easing _(default: "ease")_
  - string — _keyword_ — "ease", "ease-in", "ease-in-out", "ease-out", "linear"
  - array — _control point coordinates_ — [ P<sub>1</sub>x, P<sub>1</sub>y, P<sub>2</sub>x, P<sub>2</sub>y ]
    - P<sub>1</sub>x — _number [0,1]_ — The desired P<sub>1</sub>x
    - P<sub>1</sub>y — _number_ — The desired P<sub>1</sub>y
    - P<sub>2</sub>x — _number [0,1]_ — The desired P<sub>2</sub>x
    - P<sub>2</sub>y — _number_ — The desired P<sub>2</sub>y
- **stopScrollOnPointerDown** — _boolean_ — The desired behavior on scroll container pointerdown events _(default: true)_

### Example of Scrolling:

```javascript
SmoothScroller.scroll({
  scrollContainer: document.querySelector("body"),
  y: 1000,
  duration: 1500,
  easing: [0, 0.25, 0.25, 1],
});
```

## **Events**

### Event Types:

- **smoothScrollPointerDown** — Dispatches on scroll container pointerdown events
- **smoothScrollPointerUp** — Dispatches on scroll container pointerup events
- **smoothScrollStart** — Dispatches when a smooth scroll starts
- **smoothScroll** — Dispatches continuously while smooth scrolling
- **smoothScrollStop** — Dispatches when a smooth scroll stops

### Event Data:

- **interruptedBy** — The cause of a scroll's interruption if it was interrupted; otherwise, null.
- **x** — The x position of the scroll container
- **y** — The y position of the scroll container
- **duration** — The requested duration of the scroll
- **elapsedTime** — The elapsed time of the scroll
- **scrollContainer** — Reference to the scroll container
- **smoothScroller** — Reference to the instance

### Example of Listening to SmoothScroller Events:

```javascript
document.addEventListener("smoothScrollStart", (event) => {
  const scrollData = event.detail; // CustomEvent data is located in event.detail
  if (scrollData.interruptedBy !== null) {
    // Do something in response to the interrupted scroll
  }
}
```

## **Promise**

The static and instance scroll methods both return a promise that resolves upon scroll completion, and the promise includes the same data as the event data above. Awaiting a promise is the easiest way to react to the result of a smooth scroll.

### Example of Awaiting a SmoothScroller Promise:

```javascript
const scrollData = await SmoothScroller.scroll({
  scrollContainer: document.querySelector("body"),
  x: 1200
  y: 400,
  duration: 2500,
})

if (scrollData.interruptedBy !== null) {
  // Do something in response to the interrupted scroll
}
```

## **Miscellaneous**

### The isScrolling Property:

An instance's isScrolling property tells you if it is scrolling or not

```javascript
if (smoothScrollerInstance.isScrolling) {
  // Do something
}
```

### The SmoothScroller Map:

The static property, SmoothScroller.scrollerMap, is a map of scroll containers mapped to their instances. Since it is a JavaScript [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) object, you can use any of the available methods that Map provides.

Since the map is iterable, one of many potential uses could be to iterate through all scrollers and synchronize multiple scrolls:

```javascript
SmoothScroller.scrollerMap.forEach((smoothScroller, scrollContainer) => {
  smoothScroller.scroll({
    x: scrollContainer.scrollWidth * 0.25,
    y: scrollContainer.scrollHeight * 0.25,
    duration: 3000,
  });
});
```
