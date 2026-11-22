import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, BackHandler} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {useHapticFeedback} from '../context/HapticFeedbackContext';
import {
  calculateRoute,
  RouteCalculationError,
} from '../services/openRouteService';
import type {Coordinate, SavedRoute} from '../types/route';

type Waypoint = {id: number; coordinate: Coordinate};
type Offset = -1 | 1;

type CalculatedRoute = {name: string; geoJson: unknown};

type Draft = {
  waypoints: Waypoint[];
  selectedId: number | null;
  draggingId: number | null;
  relocatingId: number | null;
  calculatedRoute: CalculatedRoute | null;
};

const EMPTY_DRAFT: Draft = {
  waypoints: [],
  selectedId: null,
  draggingId: null,
  relocatingId: null,
  calculatedRoute: null,
};

function mapCoordinate([longitude, latitude]: Coordinate): Coordinate | null {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90
  ) {
    return null;
  }

  const wrappedLongitude =
    longitude >= -180 && longitude < 180
      ? longitude
      : ((((longitude + 180) % 360) + 360) % 360) - 180;
  return [wrappedLongitude, latitude];
}

export function useRouteDraft() {
  const {triggerHaptic} = useHapticFeedback();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // Native gesture and network events can arrive before the next React render.
  const current = useRef(EMPTY_DRAFT);
  const nextId = useRef(0);
  const request = useRef<AbortController | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const update = useCallback((next: Draft) => {
    current.current = next;
    setDraft(next);
  }, []);

  const cancelCalculation = useCallback(() => {
    if (request.current) {
      const pending = request.current;
      request.current = null;
      pending.abort();
      setIsCalculating(false);
    }
  }, []);

  const cancelRelocation = useCallback(() => {
    const state = current.current;
    if (state.relocatingId === null) {
      return false;
    }

    update({...state, relocatingId: null});
    return true;
  }, [update]);

  const cancelInteraction = useCallback(() => {
    cancelCalculation();
    const state = current.current;
    if (state.draggingId !== null) {
      const id = nextId.current++;
      // Remount the native marker at its saved position if a drag is interrupted.
      update({
        ...state,
        draggingId: null,
        selectedId: id,
        waypoints: state.waypoints.map(point =>
          point.id === state.draggingId ? {...point, id} : point,
        ),
      });
    }
    cancelRelocation();
  }, [cancelCalculation, cancelRelocation, update]);

  useFocusEffect(useCallback(() => cancelInteraction, [cancelInteraction]));

  useEffect(() => {
    if (draft.relocatingId !== null) {
      const back = BackHandler.addEventListener(
        'hardwareBackPress',
        cancelRelocation,
      );
      return () => back.remove();
    }
  }, [cancelRelocation, draft.relocatingId]);

  const editWaypoints = (
    state: Draft,
    waypoints: Waypoint[],
    selectedId: number | null,
  ) => {
    cancelCalculation();
    update({
      ...state,
      waypoints,
      selectedId,
      draggingId: null,
      relocatingId: null,
      calculatedRoute: null,
    });
  };

  const setWaypointPosition = (
    state: Draft,
    id: number,
    coordinate: Coordinate,
  ) => {
    const waypoint = state.waypoints.find(point => point.id === id);
    if (
      !waypoint ||
      waypoint.coordinate.every((value, index) => value === coordinate[index])
    ) {
      update({...state, draggingId: null, relocatingId: null});
      return;
    }

    const waypoints = state.waypoints.map(point =>
      point.id === id ? {...point, coordinate} : point,
    );
    editWaypoints(state, waypoints, id);
  };

  const handleMapTap = (position: Coordinate) => {
    const state = current.current;
    const coordinate = mapCoordinate(position);
    if (!coordinate || state.draggingId !== null) {
      return;
    }

    triggerHaptic('impactLight');
    if (state.relocatingId !== null) {
      setWaypointPosition(state, state.relocatingId, coordinate);
      return;
    }

    const waypoint = {id: nextId.current++, coordinate};
    editWaypoints(state, [...state.waypoints, waypoint], null);
  };

  const selectWaypoint = (id: number) => {
    const state = current.current;
    const waypoint = state.waypoints.find(point => point.id === id);
    if (state.draggingId !== null || state.relocatingId !== null || !waypoint) {
      return null;
    }

    triggerHaptic('selection');
    update({...state, selectedId: id});
    return waypoint.coordinate;
  };

  const handleMarkerTap = (id: number) => {
    const state = current.current;
    if (state.relocatingId === null) {
      return selectWaypoint(id) !== null;
    }

    const target = state.waypoints.find(point => point.id === id);
    if (target) {
      handleMapTap(target.coordinate);
    }
    return false;
  };

  const beginRelocation = () => {
    const state = current.current;
    const waypoint = state.waypoints.find(
      point => point.id === state.selectedId,
    );
    if (!waypoint || state.draggingId !== null || state.relocatingId !== null) {
      return null;
    }

    cancelCalculation();
    triggerHaptic('selection');
    update({...state, relocatingId: waypoint.id});
    return waypoint.coordinate;
  };

  const startMovingWaypoint = (id: number) => {
    const state = current.current;
    if (
      state.draggingId !== null ||
      state.relocatingId !== null ||
      !state.waypoints.some(waypoint => waypoint.id === id)
    ) {
      return;
    }

    cancelCalculation();
    triggerHaptic('impactMedium');
    update({...state, selectedId: id, draggingId: id});
  };

  const moveWaypoint = (id: number, position: Coordinate) => {
    const state = current.current;
    if (state.draggingId !== id) {
      return;
    }

    const coordinate = mapCoordinate(position);
    if (!coordinate) {
      update({...state, draggingId: null});
      return;
    }
    setWaypointPosition(state, id, coordinate);
  };

  const removeSelectedWaypoint = () => {
    const state = current.current;
    if (
      state.selectedId === null ||
      state.draggingId !== null ||
      state.relocatingId !== null
    ) {
      return;
    }

    triggerHaptic('notificationWarning');
    editWaypoints(
      state,
      state.waypoints.filter(point => point.id !== state.selectedId),
      null,
    );
  };

  const reorderSelectedWaypoint = (offset: Offset) => {
    const state = current.current;
    const index = state.waypoints.findIndex(
      point => point.id === state.selectedId,
    );
    const target = index + offset;
    if (
      state.draggingId !== null ||
      state.relocatingId !== null ||
      index < 0 ||
      target < 0 ||
      target >= state.waypoints.length
    ) {
      return;
    }

    const waypoints = [...state.waypoints];
    [waypoints[index], waypoints[target]] = [
      waypoints[target],
      waypoints[index],
    ];
    triggerHaptic('impactLight');
    editWaypoints(state, waypoints, state.selectedId);
  };

  const clearWaypoints = () => {
    cancelCalculation();
    update(EMPTY_DRAFT);
  };

  const loadSavedRoute = useCallback(
    (route: SavedRoute) => {
      cancelCalculation();
      update({
        ...EMPTY_DRAFT,
        waypoints: route.waypoints.map(coordinate => ({
          id: nextId.current++,
          coordinate,
        })),
        calculatedRoute: {name: route.name, geoJson: route.geoJson},
      });
    },
    [cancelCalculation, update],
  );

  const calculateCurrentRoute = async () => {
    const {waypoints, draggingId, relocatingId} = current.current;
    if (
      request.current ||
      waypoints.length < 2 ||
      draggingId !== null ||
      relocatingId !== null
    ) {
      return;
    }

    const pending = new AbortController();
    request.current = pending;
    setIsCalculating(true);
    triggerHaptic('selection');
    try {
      const geoJson = await calculateRoute(
        waypoints.map(point => point.coordinate),
        pending.signal,
      );
      if (request.current === pending) {
        update({
          ...current.current,
          calculatedRoute: {name: 'Percorso', geoJson},
        });
        triggerHaptic('notificationSuccess');
      }
    } catch (error) {
      if (request.current === pending) {
        triggerHaptic('notificationError');
        Alert.alert(
          'Percorso non calcolato',
          error instanceof RouteCalculationError
            ? error.message
            : 'Non è stato possibile calcolare il percorso. Controlla la connessione e riprova.',
        );
      }
    } finally {
      if (request.current === pending) {
        request.current = null;
        setIsCalculating(false);
      }
    }
  };

  const getRouteSnapshot = () => {
    const {waypoints, draggingId, relocatingId, calculatedRoute} =
      current.current;
    return draggingId === null && relocatingId === null && calculatedRoute
      ? {calculatedRoute, waypoints: waypoints.map(point => point.coordinate)}
      : null;
  };

  return {
    ...draft,
    isCalculating,
    handleMapTap,
    handleMarkerTap,
    beginRelocation,
    cancelRelocation,
    selectWaypoint,
    startMovingWaypoint,
    moveWaypoint,
    removeSelectedWaypoint,
    reorderSelectedWaypoint,
    clearWaypoints,
    loadSavedRoute,
    calculateCurrentRoute,
    getRouteSnapshot,
  };
}
