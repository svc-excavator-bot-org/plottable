///<reference path="../reference.ts" />

module Plottable {
export module Component {
  export class InterpolatedColorLegend extends AbstractComponent {
    private _measurer: SVGTypewriter.Measurers.Measurer;
    private _wrapper: SVGTypewriter.Wrappers.Wrapper;
    private _writer: SVGTypewriter.Writers.Writer;
    private _scale: Scale.InterpolatedColor;
    private _orientation: String ;
    private _padding = 5;
    private _formatter: Formatter;

    private _swatchContainer: D3.Selection;
    private _lowerLabel: D3.Selection;
    private _upperLabel: D3.Selection;

    /**
     * The css class applied to the legend labels.
     */
    public static LEGEND_LABEL_CLASS = "legend-label";

    /**
     * Creates an InterpolatedColorLegend.
     *
     * The InterpolatedColorLegend consists of a sequence of swatches, showing the
     * associated Scale.InterpolatedColor sampled at various points. Two labels
     * show the maximum and minimum values of the Scale.InterpolatedColor.
     *
     * @constructor
     * @param {Scale.InterpolatedColor} interpolatedColorScale
     * @param {string} orientation (horizontal/left/right).
     * @param {Formatter} The labels are formatted using this function.
     */
    constructor(interpolatedColorScale: Scale.InterpolatedColor, orientation = "horizontal", formatter = Formatters.general()) {
      super();
      if (interpolatedColorScale == null ) {
        throw new Error("InterpolatedColorLegend requires a interpolatedColorScale");
      }
      this._scale = interpolatedColorScale;
      this._formatter = formatter;
      this._orientation = InterpolatedColorLegend.validateOrientation(orientation);

      this._fixedWidthFlag = true;
      this._fixedHeightFlag = true;
    }

    /**
     * Gets the current formatter on the InterpolatedColorLegend.
     *
     * @returns {Formatter} The current Formatter.
     */
    public formatter(): Formatter;
    /**
     * Sets the current formatter on the InterpolatedColorLegend.
     *
     * @param {Formatter} formatter If provided, data will be passed though `formatter(data)`.
     * @returns {InterpolatedColorLegend} The calling InterpolatedColorLegend.
     */
    public formatter(formatter: Formatter): InterpolatedColorLegend;
    public formatter(formatter?: Formatter): any {
      if (formatter === undefined) {
        return this._formatter;
      }
      this._formatter = formatter;
      this._invalidateLayout();
      return this;
    }

    private static validateOrientation(orientation: string) {
      orientation = orientation.toLowerCase();
      if (orientation === "horizontal" || orientation === "left" || orientation === "right") {
        return orientation;
      } else {
        throw new Error("\"" + orientation + "\" is not a valid orientation for InterpolatedColorLegend");
      }
    }

    /**
     * Gets the orientation of the InterpolatedColorLegend.
     *
     * @returns {string} The current orientation.
     */
    public orient(): string;
    /**
     * Sets the orientation of the InterpolatedColorLegend.
     *
     * @param {string} newOrientation The desired orientation (horizontal/left/right).
     *
     * @returns {InterpolatedColorLegend} The calling InterpolatedColorLegend.
     */
    public orient(newOrientation: string): InterpolatedColorLegend;
    public orient(newOrientation?: string): any {
      if (newOrientation == null) {
        return this._orientation;
      } else {
        this._orientation = InterpolatedColorLegend.validateOrientation(newOrientation);
        this._invalidateLayout();
        return this;
      }
    }

    protected _setup() {
      super._setup();
      this.classed("legend", true).classed("interpolated-color-legend", true);

      this._swatchContainer = this._content.append("g").classed("swatch-container", true);
      this._lowerLabel = this._content.append("g").classed(InterpolatedColorLegend.LEGEND_LABEL_CLASS, true);
      this._upperLabel = this._content.append("g").classed(InterpolatedColorLegend.LEGEND_LABEL_CLASS, true);

      this._measurer = new SVGTypewriter.Measurers.Measurer(this._content);
      this._wrapper = new SVGTypewriter.Wrappers.Wrapper();
      this._writer = new SVGTypewriter.Writers.Writer(this._measurer, this._wrapper);
    }

    public _requestedSpace(offeredWidth: number, offeredHeight: number): _SpaceRequest {
      var textHeight = this._measurer.measure().height;

      var ticks = this._scale.ticks();
      var numSwatches = ticks.length;

      var domain = this._scale.domain();
      var labelWidths = domain.map((d: number) => this._measurer.measure(this._formatter(d)).width);

      var desiredHeight: number;
      var desiredWidth: number;
      if (this._isVertical()) {
        var longestWidth = _Util.Methods.max(labelWidths, 0);
        desiredWidth = this._padding + textHeight + this._padding + longestWidth + this._padding;
        desiredHeight = this._padding + numSwatches * textHeight + this._padding;
      } else {
        var totalWidth = labelWidths[0] + labelWidths[1];
        desiredHeight = this._padding + textHeight + this._padding;
        desiredWidth = this._padding + labelWidths[0] + this._padding
                        + numSwatches * textHeight
                        + this._padding + labelWidths[1] + this._padding;
      }

      return {
        width : desiredWidth,
        height: desiredHeight,
        wantsWidth: offeredWidth < desiredWidth,
        wantsHeight: offeredHeight < desiredHeight
      };
    }

    private _isVertical() {
      return this._orientation !== "horizontal";
    }

    public _doRender() {
      super._doRender();

      var domain = this._scale.domain();

      var textHeight = this._measurer.measure().height;
      var text0 = this._formatter(domain[0]);
      var text0Width = this._measurer.measure(text0).width;
      var text1 = this._formatter(domain[1]);
      var text1Width = this._measurer.measure(text1).width;

      var ticks = this._scale.ticks();
      var numSwatches = ticks.length;

      var padding = this._padding;

      var upperLabelShift: Point = { x: 0, y: 0 };
      var lowerLabelShift: Point = { x: 0, y: 0 };
      var lowerWriteOptions = {
                selection: this._lowerLabel,
                xAlign: "center",
                yAlign: "center",
                textRotation: 0
            };
      var upperWriteOptions = {
                selection: this._upperLabel,
                xAlign: "center",
                yAlign: "center",
                textRotation: 0
            };

      var swatchWidth: number;
      var swatchHeight: number;
      var swatchX: (d: any, i: number) => number;
      var swatchY: (d: any, i: number) => number;

      if (this._isVertical()) {
        var longestTextWidth = text1Width > text0Width ? text1Width : text0Width;
        swatchWidth = this.width() - 3 * padding - longestTextWidth;
        swatchHeight = (this.height() - 2 * padding) / numSwatches;
        swatchY = (d: any, i: number) => padding + (numSwatches - (i + 1)) * swatchHeight;

        upperWriteOptions.yAlign = "top";
        upperLabelShift.y = padding;
        lowerWriteOptions.yAlign = "bottom";
        lowerLabelShift.y = -padding;

        if (this._orientation === "left") {
          swatchX = (d: any, i: number) => padding + longestTextWidth + padding;
          upperWriteOptions.xAlign = "right";
          upperLabelShift.x = -(padding + swatchWidth + padding);
          lowerWriteOptions.xAlign = "right";
          lowerLabelShift.x = -(padding + swatchWidth + padding);
        } else { // right
          swatchX = (d: any, i: number) => padding;
          upperWriteOptions.xAlign = "left";
          upperLabelShift.x = padding + swatchWidth + padding;
          lowerWriteOptions.xAlign = "left";
          lowerLabelShift.x = padding + swatchWidth + padding;
        }
      } else { // horizontal
        swatchWidth = (this.width() - 4 * padding - text0Width - text1Width) / numSwatches;
        swatchHeight = this.height() - 2 * padding;
        swatchX = (d: any, i: number) => (padding + text0Width + padding) + i * swatchWidth;
        swatchY = (d: any, i: number) => padding;

        upperWriteOptions.xAlign = "right";
        upperLabelShift.x = -padding;
        lowerWriteOptions.xAlign = "left";
        lowerLabelShift.x = padding;
      }

      this._upperLabel.text(""); // clear the upper label
      this._writer.write(text1, this.width(), this.height(), upperWriteOptions);
      var upperTranslateString = "translate(" + upperLabelShift.x + ", " + upperLabelShift.y + ")";
      this._upperLabel.attr("transform", upperTranslateString);

      this._lowerLabel.text(""); // clear the lower label
      this._writer.write(text0, this.width(), this.height(), lowerWriteOptions);
      var lowerTranslateString = "translate(" + lowerLabelShift.x + ", " + lowerLabelShift.y + ")";
      this._lowerLabel.attr("transform", lowerTranslateString);

      swatchWidth = Math.max(swatchWidth, 0);
      swatchHeight = Math.max(swatchHeight, 0);
      var swatches = this._swatchContainer.selectAll("rect.swatch").data(ticks);
      swatches.enter().append("rect").classed("swatch", true);
      swatches.exit().remove();
      swatches.attr({
        "fill": (d: any, i: number) => this._scale.scale(d),
        "width": swatchWidth,
        "height": swatchHeight,
        "x": swatchX,
        "y": swatchY
      });
    }

  }
}
}
