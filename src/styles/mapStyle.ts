import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },

  map: {
    flex: 1,
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
