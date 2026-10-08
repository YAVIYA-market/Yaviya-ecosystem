import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { classifyUrl, SITE_URL } from '../lib/navigation';

export default function Marketplace() {
  const web = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [instance, setInstance] = useState(0);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || failed) return false;
      web.current?.goBack(); return true;
    });
    return () => listener.remove();
  }, [canGoBack, failed]);
  function retry() { setFailed(false); setLoading(true); setCanGoBack(false); setInstance(x => x + 1); }
  return <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    {failed ? <View style={styles.error}>
      <Text style={styles.brand}>YAVIYA<Text style={styles.dot}>●</Text></Text>
      <Text style={styles.title}>Connexion interrompue</Text>
      <Text style={styles.message}>Vérifiez votre connexion internet, puis réessayez.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={retry}><Text style={styles.buttonText}>Réessayer</Text></Pressable>
    </View> : <WebView key={instance} ref={web} source={{ uri: SITE_URL }} style={styles.web}
      originWhitelist={['https://*', 'mailto:*', 'tel:*']}
      onShouldStartLoadWithRequest={request => {
        const policy = classifyUrl(request.url);
        if (policy === 'internal') return true;
        if (policy === 'external') void Linking.openURL(request.url).catch(() => {});
        return false;
      }}
      onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
      onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)}
      onError={() => { setFailed(true); setLoading(false); }}
      onHttpError={event => { if (event.nativeEvent.statusCode >= 400) { setFailed(true); setLoading(false); } }}
      onContentProcessDidTerminate={retry}
      javaScriptEnabled domStorageEnabled sharedCookiesEnabled
      mixedContentMode="never" allowFileAccess={false} setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures
    />}
    {loading && !failed && <View style={styles.loading} pointerEvents="none"><ActivityIndicator color="#f97316" /><Text style={styles.message}>Ouverture de YAVIYA…</Text></View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' }, web: { flex: 1 },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  error: { flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 20 },
  brand: { fontSize: 32, fontWeight: '800', color: '#172033' }, dot: { color: '#f97316', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#172033' }, message: { color: '#64748b', textAlign: 'center', fontSize: 16 },
  button: { backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 28 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
