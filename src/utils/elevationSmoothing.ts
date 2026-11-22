export type ElevationPoint = {
  distanceMeters: number;
  elevationMeters: number;
};

const SMOOTHING_WINDOW_METERS = 250;
const DETAIL_WINDOW_METERS = 50;
const FLANK_STEP_METERS = 50;
const FULL_FLANK_GAIN_METERS = 3;
const MAX_RELIABLE_GRADE = 0.4;

function createElevationSampler(points: ElevationPoint[]) {
  let index = 0;

  return (distance: number) => {
    while (
      index + 1 < points.length &&
      points[index + 1].distanceMeters <= distance
    ) {
      index++;
    }

    const start = points[index];
    const end = points[index + 1];
    const elevation = end
      ? start.elevationMeters +
        ((distance - start.distanceMeters) /
          (end.distanceMeters - start.distanceMeters)) *
          (end.elevationMeters - start.elevationMeters)
      : start.elevationMeters;

    return {index, elevation};
  };
}

function createMovingAverage(
  points: ElevationPoint[],
  areas: number[],
  radius: number,
) {
  const distance = points[points.length - 1].distanceMeters;
  const sampleLeft = createElevationSampler(points);
  const sampleRight = createElevationSampler(points);

  function areaAt(
    at: number,
    sample: ReturnType<typeof createElevationSampler>,
  ) {
    const {index, elevation} = sample(at);
    const start = points[index];
    return (
      areas[index] +
      ((at - start.distanceMeters) * (start.elevationMeters + elevation)) / 2
    );
  }

  return (at: number) => {
    const left = Math.max(0, at - radius);
    const right = Math.min(distance, at + radius);
    return (
      (areaAt(right, sampleRight) - areaAt(left, sampleLeft)) / (right - left)
    );
  };
}

function getFlankSupport(innerGain: number, outerGain: number, step: number) {
  const smallerGain = Math.min(Math.abs(innerGain), Math.abs(outerGain));
  const largerGain = Math.max(Math.abs(innerGain), Math.abs(outerGain));
  if (innerGain * outerGain <= 0 || largerGain > MAX_RELIABLE_GRADE * step) {
    return 0;
  }

  // Detail gets full weight when both halves have comparable, sustained grades.
  const gradeRatio = smallerGain / largerGain;
  const consistency = Math.max(0, Math.min(1, 4 * gradeRatio - 1));
  return consistency * Math.min(1, smallerGain / FULL_FLANK_GAIN_METERS);
}

export function smoothElevation(points: ElevationPoint[]): ElevationPoint[] {
  if (points.length < 3) {
    return points;
  }

  const distance = points[points.length - 1].distanceMeters;
  if (distance <= 0) {
    return points;
  }

  // Integrate between points so dense runs of samples receive no extra weight.
  const areas = [0];
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    const width = end.distanceMeters - start.distanceMeters;
    areas.push(
      areas[index - 1] +
        (width * (start.elevationMeters + end.elevationMeters)) / 2,
    );
  }

  const average = createMovingAverage(
    points,
    areas,
    Math.min(SMOOTHING_WINDOW_METERS / 2, distance / 8),
  );
  const detail = createMovingAverage(
    points,
    areas,
    Math.min(DETAIL_WINDOW_METERS / 2, distance / 8),
  );
  const sampleBefore = createElevationSampler(points);
  const sampleAfter = createElevationSampler(points);
  const sampleFurtherBefore = createElevationSampler(points);
  const sampleFurtherAfter = createElevationSampler(points);

  return points.map(({distanceMeters, elevationMeters}) => {
    const step = Math.min(
      FLANK_STEP_METERS,
      distanceMeters / 2,
      (distance - distanceMeters) / 2,
    );
    if (step <= 0) {
      return {distanceMeters, elevationMeters};
    }

    const before = sampleBefore(distanceMeters - step).elevation;
    const after = sampleAfter(distanceMeters + step).elevation;
    const incomingGain = elevationMeters - before;
    const outgoingGain = after - elevationMeters;
    let filtered = average(distanceMeters);

    if (incomingGain * outgoingGain < 0) {
      const furtherBefore = sampleFurtherBefore(
        distanceMeters - 2 * step,
      ).elevation;
      const furtherAfter = sampleFurtherAfter(
        distanceMeters + 2 * step,
      ).elevation;
      const support = Math.min(
        getFlankSupport(incomingGain, before - furtherBefore, step),
        getFlankSupport(outgoingGain, furtherAfter - after, step),
      );
      if (support > 0) {
        filtered += support * (detail(distanceMeters) - filtered);
      }
    }

    return {distanceMeters, elevationMeters: filtered};
  });
}
