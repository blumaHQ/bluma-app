import { useMemo } from 'react';
import Svg, {
  Circle,
  G,
  Line,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';
import {
  BBT_CHART_PADDING as PAD,
  type BbtChartModel,
  toChartXY,
} from '../utils/bbtChartUtils';

type BbtChartProps = {
  model: BbtChartModel;
  width: number;
  height: number;
  lineColor: string;
  gridColor: string;
  labelColor: string;
};

export function BbtChart({
  model,
  width,
  height,
  lineColor,
  gridColor,
  labelColor,
}: BbtChartProps) {
  const plotted = useMemo(
    () =>
      model.points.map(point => ({
        ...toChartXY(
          point.dayIndex,
          point.value,
          model.dayCount,
          model.yMin,
          model.yMax,
          width,
          height
        ),
        date: point.date,
      })),
    [model, width, height]
  );

  const polylinePoints = plotted.map(p => `${p.x},${p.y}`).join(' ');

  if (width <= 0 || height <= 0) return null;

  return (
    <Svg width={width} height={height}>
      {model.yTicks.map(tick => {
        const { y } = toChartXY(
          0,
          tick,
          model.dayCount,
          model.yMin,
          model.yMax,
          width,
          height
        );
        return (
          <G key={`y-${tick}`}>
            <Line
              x1={PAD.left}
              y1={y}
              x2={width - PAD.right}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
            <SvgText
              x={PAD.left - 8}
              y={y + 4}
              fill={labelColor}
              fontSize={10}
              fontWeight="bold"
              textAnchor="end"
            >
              {tick.toFixed(2)}
            </SvgText>
          </G>
        );
      })}
      {model.xTicks.map(tick => {
        const { x } = toChartXY(
          tick.dayIndex,
          model.yMin,
          model.dayCount,
          model.yMin,
          model.yMax,
          width,
          height
        );
        return (
          <G key={`x-${tick.dayIndex}`}>
            <Line
              x1={x}
              y1={PAD.top}
              x2={x}
              y2={height - PAD.bottom}
              stroke={gridColor}
              strokeWidth={1}
            />
            <SvgText
              x={x}
              y={height - 8}
              fill={labelColor}
              fontSize={10}
              textAnchor="middle"
            >
              {tick.label}
            </SvgText>
          </G>
        );
      })}
      {plotted.length >= 2 && (
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {plotted.map(point => (
        <Circle
          key={point.date}
          cx={point.x}
          cy={point.y}
          r={4}
          fill={lineColor}
        />
      ))}
    </Svg>
  );
}
