import * as Network from "expo-network";

/** Wraps expo-network so screens never import it directly. */
export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected ?? false;
}

/** Fires whenever connectivity changes. Returns an unsubscribe function. */
export function addConnectivityListener(callback: (online: boolean) => void): () => void {
  const subscription = Network.addNetworkStateListener((state) => {
    callback(state.isConnected ?? false);
  });
  return () => subscription.remove();
}
