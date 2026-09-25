import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useHapticFeedback} from '../context/HapticFeedbackContext';
import type {RootTabParamList} from '../navigation/types';
import {deleteSavedRoute, getSavedRoutes} from '../services/savedRoutesService';
import type {SavedRoute} from '../types/route';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  getRouteTerrainDetails,
  getRouteStats,
} from '../utils/routeStats';

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

type RouteFilter = 'all' | 'recent' | 'long';

type SavedRoutesScreenProps = BottomTabScreenProps<
  RootTabParamList,
  'SavedRoutes'
>;

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);

  return Number.isNaN(date.getTime())
    ? 'Data non disponibile'
    : dateFormatter.format(date);
}

function isLoopRoute(route: SavedRoute) {
  return /\banello\b/i.test(route.name);
}

function getRouteCategory(route: SavedRoute) {
  const gravelSurface = getRouteTerrainDetails(route.geoJson)?.surfaces.find(
    surface => surface.label === 'Sterrato',
  );

  return gravelSurface && gravelSurface.percentage >= 30
    ? 'Gravel'
    : 'Cicloturismo';
}

function formatWaypointCount(count: number) {
  if (count === 1) {
    return '1 punto del percorso';
  }

  return count > 2 ? `${count} waypoint` : `${count} punti del percorso`;
}

export function SavedRoutesScreen({navigation}: SavedRoutesScreenProps) {
  const {triggerHaptic} = useHapticFeedback();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RouteFilter>('all');

  const loadRoutes = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const savedRoutes = await getSavedRoutes();
      setRoutes(
        [...savedRoutes].sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime(),
        ),
      );
      setErrorMessage(null);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Non è stato possibile leggere i percorsi.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [loadRoutes]),
  );

  const filteredRoutes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('it-IT');
    const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return routes.filter(route => {
      const matchesQuery = route.name
        .toLocaleLowerCase('it-IT')
        .includes(normalizedQuery);
      const routeStats = getRouteStats(route.geoJson);

      if (!matchesQuery) {
        return false;
      }
      if (activeFilter === 'recent') {
        return new Date(route.createdAt).getTime() >= recentThreshold;
      }
      if (activeFilter === 'long') {
        return (routeStats?.distanceMeters ?? 0) > 50_000;
      }
      return true;
    });
  }, [activeFilter, routes, searchQuery]);

  const selectFilter = (filter: RouteFilter) => {
    triggerHaptic('selection');
    setActiveFilter(filter);
  };

  const confirmDeleteRoute = (routeToDelete: SavedRoute) => {
    triggerHaptic('notificationWarning');
    Alert.alert(
      'Elimina percorso',
      `Vuoi eliminare “${routeToDelete.name}”? Questa azione non può essere annullata.`,
      [
        {text: 'Annulla', style: 'cancel'},
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setDeletingRouteId(routeToDelete.id);
            try {
              await deleteSavedRoute(routeToDelete.id);
              setRoutes(currentRoutes =>
                currentRoutes.filter(route => route.id !== routeToDelete.id),
              );
              triggerHaptic('notificationSuccess');
            } catch (error: unknown) {
              triggerHaptic('notificationError');
              const message =
                error instanceof Error ? error.message : 'Errore sconosciuto.';
              Alert.alert(
                'Eliminazione non riuscita',
                `Non è stato possibile eliminare il percorso.\n\nDettaglio: ${message}`,
              );
            } finally {
              setDeletingRouteId(null);
            }
          },
        },
      ],
    );
  };

  const openRoute = (routeToOpen: SavedRoute) => {
    triggerHaptic('selection');
    navigation.navigate('Map', {savedRoute: routeToOpen});
  };

  const createRoute = () => {
    triggerHaptic('selection');
    navigation.navigate('Map');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.statusText}>Caricamento percorsi...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerArea}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ARCHIVIO ATTIVITÀ</Text>
            <Text style={styles.title}>Percorsi salvati</Text>
            <Text style={styles.subtitle}>
              {routes.length}{' '}
              {routes.length === 1
                ? 'itinerario sincronizzato'
                : 'itinerari sincronizzati'}
            </Text>
          </View>
          <Pressable
            cssInterop={false}
            accessibilityRole="button"
            accessibilityLabel="Crea un nuovo percorso"
            style={({pressed}) => [
              styles.newButton,
              pressed && styles.newButtonPressed,
            ]}
            onPress={createRoute}
          >
            <MaterialCommunityIcons name="plus" color="#FFFFFF" size={18} />
            <Text style={styles.newButtonText}>Nuovo</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" color="#94A3B8" size={20} />
          <TextInput
            accessibilityLabel="Cerca nei percorsi salvati"
            value={searchQuery}
            style={styles.searchInput}
            placeholder="Cerca nei tuoi percorsi..."
            placeholderTextColor="#0F172A"
            returnKeyType="search"
            onChangeText={setSearchQuery}
          />
          <MaterialCommunityIcons name="tune-variant" color="#94A3B8" size={17} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filters}
        >
          <FilterChip
            active={activeFilter === 'all'}
            label={`Tutti (${routes.length})`}
            onPress={() => selectFilter('all')}
          />
          <FilterChip
            active={activeFilter === 'recent'}
            label="Recenti"
            onPress={() => selectFilter('recent')}
          />
          <FilterChip
            active={activeFilter === 'long'}
            label="Lunghi (>50 km)"
            onPress={() => selectFilter('long')}
          />
        </ScrollView>
      </View>

      <FlatList
        style={styles.routeList}
        data={filteredRoutes}
        keyExtractor={route => route.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadRoutes(true)}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
        renderItem={({item}) => {
          const routeStats = getRouteStats(item.geoJson);
          const routeCategory = getRouteCategory(item);
          const distance = routeStats
            ? formatDistance(routeStats.distanceMeters)
            : '—';
          const elevation = routeStats
            ? formatElevation(routeStats.ascentMeters)
            : '—';
          const duration =
            routeStats && routeStats.durationSeconds !== null
              ? formatDuration(routeStats.durationSeconds)
              : '—';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.routeIdentity}>
                  <View style={styles.routeIcon}>
                    <MaterialCommunityIcons
                      name={isLoopRoute(item) ? 'repeat' : 'arrow-top-right'}
                      color="#059669"
                      size={23}
                    />
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.routeName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.dateRow}>
                      <MaterialCommunityIcons
                        name="calendar-blank-outline"
                        color="#94A3B8"
                        size={14}
                      />
                      <Text style={styles.routeDate}>
                        {formatCreatedAt(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  style={[
                    styles.routeBadge,
                    routeCategory === 'Gravel' && styles.routeBadgeGravel,
                  ]}
                >
                  <Text
                    style={[
                      styles.routeBadgeText,
                      routeCategory === 'Gravel' && styles.routeBadgeTextGravel,
                    ]}
                  >
                    {routeCategory}
                  </Text>
                </View>
              </View>

              <View style={styles.routeStats}>
                <RouteMetric
                  icon="sign-direction"
                  label="DISTANZA"
                  value={distance}
                />
                <View style={styles.routeStatsDivider} />
                <RouteMetric
                  icon="trending-up"
                  label="DISLIVELLO"
                  value={elevation}
                />
                <View style={styles.routeStatsDivider} />
                <RouteMetric
                  icon="clock-outline"
                  label="TEMPO"
                  value={duration}
                />
              </View>

              <View style={styles.divider} />
              <View style={styles.cardFooter}>
                <View style={styles.waypointRow}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    color="#059669"
                    size={22}
                  />
                  <Text style={styles.waypointCount}>
                    {formatWaypointCount(item.waypoints.length)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Elimina il percorso ${item.name}`}
                    accessibilityState={{disabled: deletingRouteId !== null}}
                    disabled={deletingRouteId !== null}
                    hitSlop={8}
                    style={({pressed}) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                      deletingRouteId !== null && styles.deleteButtonDisabled,
                    ]}
                    onPress={() => confirmDeleteRoute(item)}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      color="#E11D48"
                      size={16}
                    />
                    <Text style={styles.deleteButtonText}>
                      {deletingRouteId === item.id ? 'Attendi' : 'Elimina'}
                    </Text>
                  </Pressable>
                  <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Apri il percorso ${item.name}`}
                    hitSlop={6}
                    style={({pressed}) => [
                      styles.openButton,
                      pressed && styles.openButtonPressed,
                    ]}
                    onPress={() => openRoute(item)}
                  >
                    <MaterialCommunityIcons
                      name="navigation-variant-outline"
                      color="#047857"
                      size={16}
                    />
                    <Text style={styles.openButtonText}>Apri</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name={
                errorMessage ? 'alert-circle-outline' : 'map-search-outline'
              }
              color="#059669"
              size={46}
            />
            <Text style={styles.emptyTitle}>
              {errorMessage
                ? 'Qualcosa è andato storto'
                : searchQuery || activeFilter !== 'all'
                ? 'Nessun percorso trovato'
                : 'Nessun percorso salvato'}
            </Text>
            <Text style={styles.emptyDescription}>
              {errorMessage
                ? errorMessage
                : searchQuery || activeFilter !== 'all'
                ? 'Prova a modificare la ricerca o il filtro selezionato.'
                : 'Crea un percorso sulla mappa e salvalo: lo ritroverai qui.'}
            </Text>
          </View>
        }
       
      />
    </SafeAreaView>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      cssInterop={false}
      hitSlop={{top: 8, bottom: 8, left: 0, right: 0}}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      style={({pressed}) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RouteMetric({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.routeStat}>
      <View style={styles.metricLabelRow}>
        <MaterialCommunityIcons name={icon} color="#94A3B8" size={13} />
        <Text style={styles.routeStatLabel}>{label}</Text>
      </View>
      <MetricValue value={value} />
    </View>
  );
}

function MetricValue({value}: {value: string}) {
  const parts = value.match(/[0-9.,]+|[^\d\s]+/g) ?? [value];

  if (parts.length === 1) {
    return <Text style={styles.routeStatValue}>{value}</Text>;
  }

  return (
    <Text style={styles.routeStatValue}>
      {parts.map((part, index) => {
        const isUnit = /^(km|m|h|min)$/.test(part);
        const displayedPart =
          part === 'h'
            ? 'h '
            : part === 'min'
            ? 'm'
            : part === 'km' || part === 'm'
            ? ` ${part}`
            : part;

        return (
          <Text
            key={`${part}-${index}`}
            style={isUnit ? styles.metricUnit : undefined}
          >
            {displayedPart}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  routeList: {flex: 1, backgroundColor: '#F8FAFC'},
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  statusText: {color: '#64748B', fontSize: 15},
  content: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {flex: 1},
  eyebrow: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#059669',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  newButtonPressed: {
    backgroundColor: '#047857',
    transform: [{scale: 0.96}],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    borderRadius: 12,
    backgroundColor: '#F1F5F9E6',
  },
  searchInput: {
    flex: 1,
    minHeight: 32,
    paddingVertical: 0,
    color: '#0F172A',
    fontSize: 12,
    lineHeight: 16,
  },
  filterScroll: {marginTop: 12, flexGrow: 0},
  filters: {flexDirection: 'row', gap: 8, paddingTop: 2},
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F099',
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  filterChipTextActive: {color: '#FFFFFF', fontWeight: '600'},
  filterChipPressed: {transform: [{scale: 0.96}]},
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0B3',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.025,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  routeIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  cardTitleContainer: {flex: 1, minWidth: 0},
  routeName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2},
  routeDate: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  routeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
  },
  routeBadgeGravel: {backgroundColor: '#FFFBEB'},
  routeBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  routeBadgeTextGravel: {color: '#B45309'},
  routeStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  routeStat: {flex: 1, paddingHorizontal: 8},
  metricLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  routeStatLabel: {
    flexShrink: 1,
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  routeStatValue: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  metricUnit: {color: '#64748B', fontSize: 11, fontWeight: '400'},
  routeStatsDivider: {width: 1, backgroundColor: '#E2E8F0CC'},
  divider: {
    height: 1,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#F1F5F9',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 0,
  },
  waypointRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  waypointCount: {
    flexShrink: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  cardActions: {flexDirection: 'row', alignItems: 'center', gap: 8},
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  deleteButtonPressed: {
    backgroundColor: '#FFF1F2',
    transform: [{scale: 0.97}],
  },
  deleteButtonDisabled: {opacity: 0.5},
  deleteButtonText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  openButtonText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  openButtonPressed: {
    backgroundColor: '#D1FAE5',
    transform: [{scale: 0.97}],
  },
  emptyState: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  syncText: {color: '#94A3B8', fontSize: 12, lineHeight: 16, flexShrink: 1},
});
