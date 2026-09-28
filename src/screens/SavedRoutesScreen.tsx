import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import {useMapPreferences} from '../context/MapPreferencesContext';
import {useTheme} from '../context/ThemeContext';
import type {RootTabParamList} from '../navigation/types';
import {
  deleteSavedRoute,
  getSavedRoutes,
  renameSavedRoute,
} from '../services/savedRoutesService';
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

type RouteFilter = 'elevation' | 'long';

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

  return `${count} waypoint`;
}

export function SavedRoutesScreen({navigation}: SavedRoutesScreenProps) {
  const {triggerHaptic} = useHapticFeedback();
  const {measurementSystem} = useMapPreferences();
  const {isDarkMode} = useTheme();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [renamingRoute, setRenamingRoute] = useState<SavedRoute | null>(null);
  const [renamedRouteName, setRenamedRouteName] = useState('');
  const [isRenamingRoute, setIsRenamingRoute] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<RouteFilter[]>([]);

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

    return routes.filter(route => {
      const matchesQuery = route.name
        .toLocaleLowerCase('it-IT')
        .includes(normalizedQuery);
      const routeStats = getRouteStats(route.geoJson);

      if (!matchesQuery) {
        return false;
      }
      if (
        activeFilters.includes('elevation') &&
        (routeStats?.ascentMeters ?? 0) <= 1_000
      ) {
        return false;
      }
      if (
        activeFilters.includes('long') &&
        (routeStats?.distanceMeters ?? 0) <= 50_000
      ) {
        return false;
      }
      return true;
    });
  }, [activeFilters, routes, searchQuery]);

  const selectFilter = (filter: RouteFilter) => {
    triggerHaptic('selection');
    setActiveFilters(current =>
      current.includes(filter)
        ? current.filter(activeFilter => activeFilter !== filter)
        : [...current, filter],
    );
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

  const openRenameRoute = (routeToRename: SavedRoute) => {
    triggerHaptic('selection');
    setRenamedRouteName(routeToRename.name);
    setRenamingRoute(routeToRename);
  };

  const closeRenameRoute = () => {
    if (!isRenamingRoute) {
      setRenamingRoute(null);
      setRenamedRouteName('');
    }
  };

  const handleRenameRoute = async () => {
    const trimmedName = renamedRouteName.trim();

    if (!renamingRoute || !trimmedName || isRenamingRoute) {
      return;
    }

    setIsRenamingRoute(true);
    try {
      await renameSavedRoute(renamingRoute.id, trimmedName);
      setRoutes(currentRoutes =>
        currentRoutes.map(route =>
          route.id === renamingRoute.id ? {...route, name: trimmedName} : route,
        ),
      );
      triggerHaptic('notificationSuccess');
      setRenamingRoute(null);
      setRenamedRouteName('');
    } catch (error: unknown) {
      triggerHaptic('notificationError');
      const message = error instanceof Error ? error.message : 'Errore sconosciuto.';
      Alert.alert(
        'Rinomina non riuscita',
        `Non è stato possibile rinominare il percorso.\n\nDettaglio: ${message}`,
      );
    } finally {
      setIsRenamingRoute(false);
    }
  };

  const createRoute = () => {
    triggerHaptic('selection');
    navigation.navigate('Map');
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.centeredContainer, isDarkMode && styles.surfaceDark]}
        edges={['top']}
      >
        <ActivityIndicator size="large" color="#059669" />
        <Text style={[styles.statusText, isDarkMode && styles.secondaryTextDark]}>
          Caricamento percorsi...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.surfaceDark]} edges={['top']}>
      <View style={[styles.headerArea, isDarkMode && styles.headerAreaDark]}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ARCHIVIO ATTIVITÀ</Text>
            <Text style={[styles.title, isDarkMode && styles.primaryTextDark]}>
              Percorsi salvati
            </Text>
            <Text style={[styles.subtitle, isDarkMode && styles.secondaryTextDark]}>
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

        <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
          <MaterialCommunityIcons name="magnify" color="#94A3B8" size={20} />
          <TextInput
            accessibilityLabel="Cerca nei percorsi salvati"
            value={searchQuery}
            style={[styles.searchInput, isDarkMode && styles.primaryTextDark]}
            placeholder="Cerca nei tuoi percorsi..."
            placeholderTextColor={isDarkMode ? '#94A3B8' : '#0F172A'}
            returnKeyType="search"
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filters}
        >
          <FilterChip
            active={activeFilters.includes('long')}
            label={`Lunghi (>${formatDistance(50_000, measurementSystem)})`}
            onPress={() => selectFilter('long')}
          />
          <FilterChip
            active={activeFilters.includes('elevation')}
            label={`Dislivello (>${formatElevation(
              1_000,
              measurementSystem,
            )})`}
            onPress={() => selectFilter('elevation')}
          />
        </ScrollView>
      </View>

      <FlatList
        style={[styles.routeList, isDarkMode && styles.surfaceDark]}
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
            ? formatDistance(routeStats.distanceMeters, measurementSystem)
            : '—';
          const elevation = routeStats
            ? formatElevation(routeStats.ascentMeters, measurementSystem)
            : '—';
          const duration =
            routeStats && routeStats.durationSeconds !== null
              ? formatDuration(routeStats.durationSeconds)
              : '—';

          return (
            <View style={[styles.card, isDarkMode && styles.cardDark]}>
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
                    <Text
                      style={[styles.routeName, isDarkMode && styles.primaryTextDark]}
                      numberOfLines={2}
                    >
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

              <View style={[styles.routeStats, isDarkMode && styles.routeStatsDark]}>
                <RouteMetric
                  icon="sign-direction"
                  label="DISTANZA"
                  value={distance}
                />
                <View
                  style={[
                    styles.routeStatsDivider,
                    isDarkMode && styles.dividerDark,
                  ]}
                />
                <RouteMetric
                  icon="trending-up"
                  label="DISLIVELLO"
                  value={elevation}
                />
                <View
                  style={[
                    styles.routeStatsDivider,
                    isDarkMode && styles.dividerDark,
                  ]}
                />
                <RouteMetric
                  icon="clock-outline"
                  label="TEMPO"
                  value={duration}
                />
              </View>

              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
              <View style={styles.cardFooter}>
                <View style={styles.waypointRow}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    color="#059669"
                    size={22}
                  />
                  <Text
                    style={[
                      styles.waypointCount,
                      isDarkMode && styles.secondaryTextDark,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatWaypointCount(item.waypoints.length)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    cssInterop={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Rinomina il percorso ${item.name}`}
                    hitSlop={8}
                    style={({pressed}) => [
                      styles.renameButton,
                      pressed && styles.renameButtonPressed,
                    ]}
                    onPress={() => openRenameRoute(item)}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      color="#0369A1"
                      size={13}
                    />
                    <Text style={styles.renameButtonText}>Rinomina</Text>
                  </Pressable>
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
            <Text style={[styles.emptyTitle, isDarkMode && styles.primaryTextDark]}>
              {errorMessage
                ? 'Qualcosa è andato storto'
                : searchQuery || activeFilters.length > 0
                ? 'Nessun percorso trovato'
                : 'Nessun percorso salvato'}
            </Text>
            <Text
              style={[
                styles.emptyDescription,
                isDarkMode && styles.secondaryTextDark,
              ]}
            >
              {errorMessage
                ? errorMessage
                : searchQuery || activeFilters.length > 0
                ? 'Prova a modificare la ricerca o il filtro selezionato.'
                : 'Crea un percorso sulla mappa e salvalo: lo ritroverai qui.'}
            </Text>
          </View>
        }
       
      />

      <Modal
        animationType="fade"
        transparent
        visible={renamingRoute !== null}
        onRequestClose={closeRenameRoute}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.renameModal, isDarkMode && styles.renameModalDark]}>
            <Text style={[styles.renameModalTitle, isDarkMode && styles.primaryTextDark]}>
              Rinomina percorso
            </Text>
            <TextInput
              accessibilityLabel="Nuovo nome del percorso"
              style={[styles.renameInput, isDarkMode && styles.renameInputDark]}
              value={renamedRouteName}
              onChangeText={setRenamedRouteName}
              placeholder="Nome del percorso"
              placeholderTextColor={isDarkMode ? '#94A3B8' : '#64748B'}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={handleRenameRoute}
            />
            <View style={styles.renameActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isRenamingRoute}
                style={styles.renameCancelButton}
                onPress={closeRenameRoute}
              >
                <Text style={[styles.renameCancelText, isDarkMode && styles.secondaryTextDark]}>
                  Annulla
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!renamedRouteName.trim() || isRenamingRoute}
                style={({pressed}) => [
                  styles.renameConfirmButton,
                  (!renamedRouteName.trim() || isRenamingRoute) &&
                    styles.renameButtonDisabled,
                  pressed && styles.renameConfirmButtonPressed,
                ]}
                onPress={handleRenameRoute}
              >
                <Text style={styles.renameConfirmText}>
                  {isRenamingRoute ? 'Salvataggio...' : 'Salva'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  const {isDarkMode} = useTheme();

  return (
    <Pressable
      cssInterop={false}
      hitSlop={{top: 8, bottom: 8, left: 0, right: 0}}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      style={({pressed}) => [
        styles.filterChip,
        isDarkMode && styles.filterChipDark,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          isDarkMode && styles.secondaryTextDark,
          active && styles.filterChipTextActive,
        ]}
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
  const {isDarkMode} = useTheme();

  return (
    <View style={styles.routeStat}>
      <View style={styles.metricLabelRow}>
        <MaterialCommunityIcons name={icon} color="#94A3B8" size={13} />
        <Text style={styles.routeStatLabel}>{label}</Text>
      </View>
      <MetricValue value={value} isDarkMode={isDarkMode} />
    </View>
  );
}

function MetricValue({
  value,
  isDarkMode,
}: {
  value: string;
  isDarkMode: boolean;
}) {
  const parts = value.match(/[0-9.,]+|[^\d\s]+/g) ?? [value];

  if (parts.length === 1) {
    return (
      <Text style={[styles.routeStatValue, isDarkMode && styles.primaryTextDark]}>
        {value}
      </Text>
    );
  }

  return (
    <Text style={[styles.routeStatValue, isDarkMode && styles.primaryTextDark]}>
      {parts.map((part, index) => {
        const isUnit = /^(km|m|mi|ft|h|min)$/.test(part);
        const displayedPart =
          part === 'h'
            ? 'h '
            : part === 'min'
            ? 'm'
            : /^(km|m|mi|ft)$/.test(part)
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
  surfaceDark: {backgroundColor: '#0F172A'},
  primaryTextDark: {color: '#F8FAFC'},
  secondaryTextDark: {color: '#CBD5E1'},
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
  headerAreaDark: {borderBottomColor: '#334155', backgroundColor: '#1E293B'},
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
  searchBoxDark: {borderColor: '#475569', backgroundColor: '#0F172A'},
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
  filterChipDark: {borderColor: '#475569', backgroundColor: '#1E293B'},
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
  cardDark: {borderColor: '#334155', backgroundColor: '#1E293B'},
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
  routeStatsDark: {borderColor: '#334155', backgroundColor: '#0F172A'},
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
  dividerDark: {backgroundColor: '#334155'},
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
  renameButton: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  renameButtonPressed: {backgroundColor: '#DBEAFE', transform: [{scale: 0.97}]},
  renameButtonText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  renameModal: {
    gap: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  renameModalDark: {backgroundColor: '#1E293B'},
  renameModalTitle: {color: '#0F172A', fontSize: 20, fontWeight: '700'},
  renameInput: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    color: '#0F172A',
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  renameInputDark: {
    borderColor: '#475569',
    color: '#F8FAFC',
    backgroundColor: '#0F172A',
  },
  renameActions: {flexDirection: 'row', gap: 12},
  renameCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  renameCancelText: {color: '#334155', fontSize: 14, fontWeight: '700'},
  renameConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  renameConfirmButtonPressed: {backgroundColor: '#047857'},
  renameButtonDisabled: {opacity: 0.5},
  renameConfirmText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
});
