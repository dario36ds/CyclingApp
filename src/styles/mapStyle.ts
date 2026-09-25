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

  routeStatHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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

  markerContainer: {
    alignItems: 'center',
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

  arrivalMarker: {
    backgroundColor: '#059669',
    borderColor: '#FFFFFF',
  },

  selectedMarker: {
    borderColor: '#6EE7B7',
    shadowColor: '#059669',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },

  markerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  markerLabel: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 7,
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  arrivalMarkerLabel: {
    borderColor: '#A7F3D0',
    color: '#047857',
    backgroundColor: 'rgba(236, 253, 245, 0.96)',
  },

  quickControls: {
    position: 'absolute',
    right: 14,
    gap: 9,
  },

  quickControlButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },

  quickControlText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },

  quickControlButtonActive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },

  quickControlTextActive: {
    color: '#047857',
  },

  actionSheet: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    gap: 11,
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },

  sheetHandle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginBottom: 1,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },

  sheetButtonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },

  sheetSecondaryButton: {
    height: 42,
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
  },

  sheetSecondaryText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },

  sheetDeleteButton: {
    height: 42,
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 13,
    backgroundColor: '#FFF1F2',
  },

  sheetDeleteText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '700',
  },

  sheetOutlineButton: {
    height: 41,
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },

  sheetOutlineText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },

  sheetSaveButton: {
    height: 41,
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 13,
    backgroundColor: '#F0F9FF',
  },

  sheetSaveText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },

  calculateButton: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 16,
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },

  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  calculateButtonDisabled: {
    opacity: 0.58,
    shadowOpacity: 0.12,
    elevation: 0,
  },

  clearButton: {
    width: '100%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },

  controlPressed: {
    opacity: 0.72,
  },

  controlDisabled: {
    opacity: 0.62,
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
