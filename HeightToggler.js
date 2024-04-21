export default class HeightToggler {

  static create(wrapper, options = {}) {
    return new HeightToggler(wrapper, options);
  }

  constructor(wrapper, options = {
    offset: 0,
    duration: 0.3,
    onUpdate: () => { }
  }) {

    this.wrapper = wrapper;
    this.options = options;

    if (!this.wrapper) {
      throw new Error('No wrapper provided');
    }

    this.container = this.wrapper.querySelector('[data-expand-container]');

    if (!this.container) {
      throw new Error('No [data-expand-container] provided');
    }

    this.items = [...this.container.querySelectorAll('[data-row-item]')];

    if (!this.items.length) {
      throw new Error('No [data-row-item] provided');
    }

    this.limit = parseInt(this.wrapper.dataset.expandHeight, 10) || 0;

    if (!this.limit) {
      throw new Error('No [data-expand-height] provided');
    }

    // Create a new ResizeObserver instance
    this.resizeObserver = new ResizeObserver(() => {
      this.setHeight();
    });

    // Observe changes to the container's size
    this.resizeObserver.observe(this.container);

    this.toggleButton = this.wrapper.querySelector('[data-expand-button]');
    this.buttonTexts = [...this.toggleButton?.querySelectorAll('span.button-text')] || [];

    this.onUpdateCallback = options.onUpdate || (() => { });

    this.initialize();
  }

  initialize() {
    const { duration, isExpanded } = this.options;

    this.isExpanded = isExpanded || false;
    this.container.style.transition = `max-height ${duration}s ease-in-out, clip-path ${duration}s ease-in-out`;

    this.toggleButton && this.toggleButton.addEventListener('click', () => this.toggleHeight());
  }


  onUpdate(callback) {
    this.onUpdateCallback = callback;
  }

  calculateRowAndGapHeight() {
    const { container, items } = this;

    // Calculate gap height (if isset)
    const containerStyle = window.getComputedStyle(container);

    const gapHeight = (() => {
      const gap = containerStyle.gap;
      if (gap === 'normal') {
        // Fallback logic
        const rowGap = parseFloat(containerStyle.rowGap) || 0;
        return rowGap;
      } else {
        return parseFloat(gap) || 0;
      }
    })();

    // Initialize variables to track rows
    let currentRowTop = 0;
    let currentRowItems = [];
    const rows = [];

    items.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const itemTop = itemRect.top.toFixed(2);

      // If the item's top position changes, save the current row and start a new row
      if (itemTop !== currentRowTop) {
        if (currentRowItems.length > 0) {
          rows.push(currentRowItems);
        }
        currentRowItems = [item];
        currentRowTop = itemTop;
      } else {
        // If the item's top position is the same as the previous one, add it to the current row
        currentRowItems.push(item);
      }
    });

    // Add the last row to the rows array
    if (currentRowItems.length > 0) {
      rows.push(currentRowItems);
    }

    // Calculate row heights
    const rowHeights = rows.map(row => {
      let maxHeight = 0;

      // Find the highest item in the row
      row.forEach(item => {
        const itemHeight = item.getBoundingClientRect().height;
        maxHeight = Math.max(maxHeight, itemHeight);
      });

      // Add the gap height to the highest item height
      const rowHeight = parseFloat((maxHeight).toFixed(2));
      return rowHeight;
    });

    return { rows, rowHeights, gapHeight };
  }



  calculateHeight() {
    const { rowHeights, gapHeight } = this.calculateRowAndGapHeight();

    let collapsedHeight = 0;
    let expandedHeight = 0;

    for (let i = 0; i < rowHeights.length; i++) {
      const currentHeight = rowHeights[i] + (i > 0 ? gapHeight : 0);

      if (i < this.limit) {
        collapsedHeight += currentHeight;
      }
      expandedHeight += currentHeight;
    }

    return {
      collapsedHeight: parseFloat(collapsedHeight.toFixed(2)),
      expandedHeight: parseFloat(expandedHeight.toFixed(2)),
      gapHeight
    };
  }


  setHeight() {
    const { container, toggleButton, isExpanded } = this;
    const { collapsedHeight, expandedHeight } = this.calculateHeight();

    const { offset } = this.options;

    container.style.maxHeight = isExpanded ? `${expandedHeight + offset}px` : `${collapsedHeight}px`;

    if (isExpanded) {
      this.container.style.clipPath = `inset(-${offset}px)`;
    } else {
      this.container.style.clipPath = `inset(-${offset}px -${offset}px calc(100% - ${collapsedHeight}px) -${offset}px)`;
    }

    toggleButton.classList.toggle('visible', expandedHeight > collapsedHeight);
    toggleButton.classList.toggle('expanded', isExpanded);

    this.buttonTexts.length && this.buttonTexts.forEach(text => {
      text.textContent = isExpanded ? toggleButton.dataset?.closeTitle : toggleButton.dataset?.openTitle;
    });

    // Invoke onUpdate callback after setting height
    this.onUpdateCallback({ isExpanded: isExpanded });
  }

  toggleHeight() {
    const { duration } = this.options;
    const wasExpanded = this.isExpanded;
    this.isExpanded = !this.isExpanded;

    const delay = duration * 1000;

    // Disconnect the ResizeObserver
    this.resizeObserver.disconnect();

    // Store the current scroll position before expanding
    if (!wasExpanded) {
      this.previousScrollPosition = window.scrollY;
    }

    this.setHeight();

    // Scroll to the top of the container when collapsing
    if (wasExpanded) {
      setTimeout(() => {
        window.scrollTo({ top: this.previousScrollPosition, behavior: 'smooth' });
      }, delay);
    }

    setTimeout(() => {
      // Reconnect the ResizeObserver after setting the new height
      this.resizeObserver.observe(this.container);

    }, delay);

  }

}
