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

  clearButton: {
  position: 'absolute',
  bottom: 40,
  left: 20,
  right: 20,
  height: 50,
  borderRadius: 14,
  backgroundColor: '#111827',
  alignItems: 'center',
  justifyContent: 'center',
},

clearButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},

routeButton: {
  position: 'absolute',
  bottom: 105,
  left: 20,
  right: 20,
  height: 50,
  borderRadius: 14,
  backgroundColor: '#16A34A',
  alignItems: 'center',
  justifyContent: 'center',
},

routeButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},

deleteWaypointButton: {
  position: 'absolute',
  bottom: 170,
  left: 20,
  right: 20,
  height: 50,
  borderRadius: 14,
  backgroundColor: '#DC2626',
  alignItems: 'center',
  justifyContent: 'center',
},

deleteWaypointButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
});
