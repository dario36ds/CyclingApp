import type {SavedRoute} from '../types/route';

export type RootTabParamList = {
  Map: {savedRoute?: SavedRoute} | undefined;
  SavedRoutes: undefined;
  Settings: undefined;
};
