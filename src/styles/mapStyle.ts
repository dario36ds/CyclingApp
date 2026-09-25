import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },

  map: {
    flex: 1,
  },

  topControls: {
    position: 'absolute',
    left: 14,
    right: 14,
    gap: 10,
  },

  mapHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  mapHeaderIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  onlineIndicator: {
    width: 10,
    height: 10,
    borderWidth: 3,
    borderColor: '#D1FAE5',
    borderRadius: 5,
    backgroundColor: '#10B981',
  },

  mapHeaderTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

  mapHeaderSubtitle: {
    marginTop: 1,
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },

  mapTypeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  mapTypeLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },

  routeStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  routeStat: {
    flex: 1,
    alignItems: 'center',
  },

  routeStatLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  routeStatValue: {
    marginTop: 2,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },

  routeStatsDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
    backgroundColor: '#E2E8F0',
  },

  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedMarker: {
    backgroundColor: '#16A34A',
    borderColor: '#FDE047',
  },

  markerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  waypointActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },

  routeActions: {
    position: 'absolute',
    bottom: 168,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  modalCard: {
    gap: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },

  elevationModalCard: {
    paddingHorizontal: 16,
  },

  terrainModalCard: {
    maxHeight: '82%',
  },

  terrainModalContent: {
    paddingBottom: 4,
  },

  modalTitle: {
    color: '#18181B',
    fontSize: 20,
    fontWeight: '700',
  },

  routeNameInput: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    borderRadius: 12,
    color: '#18181B',
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },

  modalActionButton: {
    flex: 1,
  },
});
