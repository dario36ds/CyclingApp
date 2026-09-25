import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type {ElevationProfileData} from '../utils/routeStats';
import {formatDistance, formatElevation} from '../utils/routeStats';

type ElevationProfileProps = {
  profile: ElevationProfileData;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const PLOT_LEFT = 42;
const PLOT_RIGHT = 12;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 28;
const MAX_RENDERED_POINTS = 240;

function samplePoints(profile: ElevationProfileData) {
  const step = Math.max(
    1,
    Math.ceil(profile.points.length / MAX_RENDERED_POINTS),
  );
  const sampledPoints = profile.points.filter(
    (_, index) => index % step === 0,
  );
  const finalPoint = profile.points[profile.points.length - 1];

  if (sampledPoints[sampledPoints.length - 1] !== finalPoint) {
    sampledPoints.push(finalPoint);
  }

  return sampledPoints;
}

export function ElevationProfile({profile}: ElevationProfileProps) {
  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const elevationRange = Math.max(
    profile.maxElevationMeters - profile.minElevationMeters,
    10,
  );
  const verticalPadding = elevationRange * 0.08;
  const chartMinElevation = profile.minElevationMeters - verticalPadding;
  const chartMaxElevation = profile.maxElevationMeters + verticalPadding;
  const chartElevationRange = chartMaxElevation - chartMinElevation;
  const points = samplePoints(profile).map(point => ({
    x:
      PLOT_LEFT +
      (point.distanceMeters / profile.distanceMeters) * plotWidth,
    y:
      PLOT_TOP +
      ((chartMaxElevation - point.elevationMeters) / chartElevationRange) *
        plotHeight,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${
    points[points.length - 1].x
  } ${PLOT_TOP + plotHeight} L ${PLOT_LEFT} ${
    PLOT_TOP + plotHeight
  } Z`;
  const middleElevation = (chartMinElevation + chartMaxElevation) / 2;

  return (
    <View
      accessible
      accessibilityLabel={`Profilo altimetrico, quota minima ${formatElevation(
        profile.minElevationMeters,
      )}, quota massima ${formatElevation(profile.maxElevationMeters)}`}
    >
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>QUOTA MINIMA</Text>
          <Text style={styles.summaryValue}>
            {formatElevation(profile.minElevationMeters)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>QUOTA MASSIMA</Text>
          <Text style={styles.summaryValue}>
            {formatElevation(profile.maxElevationMeters)}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <Defs>
            <LinearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#10B981" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#10B981" stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          {[PLOT_TOP, PLOT_TOP + plotHeight / 2, PLOT_TOP + plotHeight].map(
            y => (
              <Line
                key={y}
                x1={PLOT_LEFT}
                x2={CHART_WIDTH - PLOT_RIGHT}
                y1={y}
                y2={y}
                stroke="#D4D4D8"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ),
          )}

          <Path d={areaPath} fill="url(#elevationFill)" />
          <Path
            d={linePath}
            fill="none"
            stroke="#047857"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <SvgText
            x={PLOT_LEFT - 6}
            y={PLOT_TOP + 4}
            fill="#71717A"
            fontSize={9}
            textAnchor="end"
          >
            {Math.round(chartMaxElevation)} m
          </SvgText>
          <SvgText
            x={PLOT_LEFT - 6}
            y={PLOT_TOP + plotHeight / 2 + 4}
            fill="#71717A"
            fontSize={9}
            textAnchor="end"
          >
            {Math.round(middleElevation)} m
          </SvgText>
          <SvgText
            x={PLOT_LEFT - 6}
            y={PLOT_TOP + plotHeight + 4}
            fill="#71717A"
            fontSize={9}
            textAnchor="end"
          >
            {Math.round(chartMinElevation)} m
          </SvgText>

          <SvgText
            x={PLOT_LEFT}
            y={CHART_HEIGHT - 5}
            fill="#71717A"
            fontSize={9}
            textAnchor="start"
          >
            0
          </SvgText>
          <SvgText
            x={PLOT_LEFT + plotWidth / 2}
            y={CHART_HEIGHT - 5}
            fill="#71717A"
            fontSize={9}
            textAnchor="middle"
          >
            {formatDistance(profile.distanceMeters / 2)}
          </SvgText>
          <SvgText
            x={CHART_WIDTH - PLOT_RIGHT}
            y={CHART_HEIGHT - 5}
            fill="#71717A"
            fontSize={9}
            textAnchor="end"
          >
            {formatDistance(profile.distanceMeters)}
          </SvgText>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#E4E4E7',
  },
  summaryLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 2,
    color: '#18181B',
    fontSize: 18,
    fontWeight: '800',
  },
  chartContainer: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
  },
});
