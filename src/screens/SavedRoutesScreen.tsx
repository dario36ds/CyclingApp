import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

import {useHapticFeedback} from '../context/HapticFeedbackContext';
import type {RootTabParamList} from '../navigation/types';
import {
  deleteSavedRoute,
  getSavedRoutes,
} from '../services/savedRoutesService';
import type {SavedRoute} from '../types/route';

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);

  return Number.isNaN(date.getTime())
    ? 'Data non disponibile'
    : dateFormatter.format(date);
}

type SavedRoutesScreenProps = BottomTabScreenProps<
  RootTabParamList,
  'SavedRoutes'
>;

export function SavedRoutesScreen({navigation}: SavedRoutesScreenProps) {
  const {triggerHaptic} = useHapticFeedback();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
                error instanceof Error
                  ? error.message
                  : 'Errore sconosciuto.';

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

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#047857" />
        <Text style={styles.statusText}>Caricamento percorsi...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={routes}
      keyExtractor={route => route.id}
      style={styles.container}
      contentContainerStyle={
        routes.length === 0 ? styles.emptyContent : styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadRoutes(true)}
          colors={['#047857']}
          tintColor="#047857"
        />
      }
      renderItem={({item}) => (
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Apri il percorso ${item.name}`}
            accessibilityHint="Mostra il percorso sulla mappa"
            style={({pressed}) => pressed && styles.cardPressed}
            onPress={() => openRoute(item)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.routeIcon}>
                <Text style={styles.routeIconText}>↗</Text>
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.routeName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.routeDate}>
                  {formatCreatedAt(item.createdAt)}
                </Text>
              </View>
            </View>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.cardFooter}>
            <Text style={styles.waypointCount}>
              {item.waypoints.length}{' '}
              {item.waypoints.length === 1 ? 'punto' : 'punti'} del percorso
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Elimina il percorso ${item.name}`}
              disabled={deletingRouteId !== null}
              hitSlop={8}
              style={({pressed}) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
              onPress={() => confirmDeleteRoute(item)}
            >
              <Text style={styles.deleteButtonText}>
                {deletingRouteId === item.id ? 'Eliminazione...' : 'Elimina'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>♧</Text>
          <Text style={styles.emptyTitle}>
            {errorMessage ? 'Qualcosa è andato storto' : 'Nessun percorso salvato'}
          </Text>
          <Text style={styles.emptyDescription}>
            {errorMessage
              ? errorMessage
              : 'Crea un percorso sulla mappa e salvalo: lo ritroverai qui.'}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F7',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F7F8F7',
  },
  statusText: {
    color: '#71717A',
    fontSize: 15,
  },
  content: {
    gap: 12,
    padding: 20,
  },
  emptyContent: {
    flexGrow: 1,
    padding: 24,
  },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  routeIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
  },
  routeIconText: {
    color: '#047857',
    fontSize: 22,
    fontWeight: '700',
  },
  cardTitleContainer: {
    flex: 1,
  },
  routeName: {
    color: '#18181B',
    fontSize: 18,
    fontWeight: '700',
  },
  routeDate: {
    marginTop: 4,
    color: '#71717A',
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: '#F0F0F1',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  waypointCount: {
    flex: 1,
    color: '#52525B',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonPressed: {
    opacity: 0.65,
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    color: '#059669',
    fontSize: 52,
  },
  emptyTitle: {
    marginTop: 14,
    color: '#18181B',
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 8,
    color: '#71717A',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
