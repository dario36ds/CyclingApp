# CyclingApp

App React Native per creare percorsi in bicicletta su una mappa. Puoi aggiungere e riordinare i punti del percorso, calcolare il tragitto, vedere distanza, durata stimata, dislivello e tipo di superficie, e salvare i percorsi sul dispositivo. Sono disponibili mappa stradale e vista satellitare, tema chiaro/scuro e unità metriche o imperiali.

## Requisiti

- Node.js **22.11 o successivo** e npm.
- Per iOS: macOS, Xcode con un simulatore iOS e CocoaPods (`pod`).
- Per Android: Android Studio, Android SDK e un emulatore avviato oppure un dispositivo con debug USB. Il progetto configura `compileSdkVersion` 37, Build Tools 37.0.0 e NDK 27.1.12297006 in `android/build.gradle`.

Dalla cartella principale del progetto installa le dipendenze JavaScript:

```sh
npm install
```

Il progetto include `package-lock.json`. Puoi usare `npm ci` al posto di `npm install` per un'installazione pulita con le versioni esatte del lockfile: elimina prima `node_modules` e non modifica il lockfile. `npm install` è il comando abituale durante lo sviluppo e può aggiornare `package-lock.json` se le dipendenze cambiano. Se hai già installato le dipendenze e non sono cambiate, non devi ripetere il comando.

## Configurazione della chiave API

L'unica variabile richiesta dal codice è `ORS_API_KEY`, usata per calcolare i percorsi con OpenRouteService. Accedi alla pagina [HeiGIT Account → API Keys](https://account.heigit.org/manage/key) per ottenere la tua chiave ORS, poi crea il file `.env` nella cartella principale:

```sh
cp .env.example .env
```

Inserisci la chiave nel file, su una sola riga:

```dotenv
ORS_API_KEY=la_tua_chiave_openrouteservice
```

`react-native-config` legge `.env` durante la compilazione nativa. Dopo aver aggiunto o cambiato la chiave, **ricompila l'app**; il solo riavvio di Metro non aggiorna il valore. Se la chiave manca, la mappa si apre comunque, ma il calcolo del percorso mostra un avviso.

Le mappe stradali e satellitari configurate nel progetto non richiedono altre variabili in `.env`.

## Avvio su iOS

Installa i pod la prima volta, dopo una nuova installazione delle dipendenze JavaScript o quando cambiano le dipendenze native:

```sh
cd ios
pod install
cd ..
```

Avvia Metro in un terminale:

```sh
npm start
```

In un secondo terminale, dalla cartella principale, compila e avvia l'app sul simulatore iOS:

```sh
npm run ios
```

La CLI usa il simulatore disponibile. Per un iPhone fisico, collega il dispositivo e usa `npm run ios -- --device` oppure passa `--udid` alla CLI; la firma iOS deve essere configurata in Xcode. Puoi aprire `ios/CyclingApp.xcworkspace` in Xcode per scegliere un simulatore o un dispositivo specifico.

Se Xcode segnala che manca `Pods-CyclingApp.debug.xcconfig` o un file in `Pods/Target Support Files`, esegui di nuovo `pod install` dalla cartella `ios`.

## Avvio su Android

Assicurati che Gradle trovi l'Android SDK: imposta `ANDROID_HOME` sul percorso dell'SDK oppure crea `android/local.properties` con `sdk.dir=/percorso/del/tuo/Android/Sdk` (il file è escluso da Git). Apri un emulatore da Android Studio oppure collega un dispositivo con debug USB. Avvia Metro in un terminale:

```sh
npm start
```

In un secondo terminale, dalla cartella principale:

```sh
npm run android
```

La configurazione Android carica `.env` tramite `react-native-config` in `android/app/build.gradle`. Se cambi `ORS_API_KEY`, esegui di nuovo `npm run android` per ricompilare l'app.

## Dipendenze principali

| Pacchetti | Ruolo nel progetto |
| --- | --- |
| `react`, `react-native` | Interfaccia e runtime dell'app mobile. |
| `@maplibre/maplibre-react-native` | Mappa interattiva, livelli GeoJSON, posizione del dispositivo e vista 3D. |
| `@react-navigation/native`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context` | Navigazione a schede e adattamento alle aree sicure dello schermo. |
| `react-native-config` | Lettura di `ORS_API_KEY` da `.env` durante la build nativa. |
| `@react-native-async-storage/async-storage` | Salvataggio locale dei percorsi e delle preferenze. |
| `react-native-haptic-feedback` | Feedback tattile delle azioni. |
| `react-native-svg`, `react-native-vector-icons` | Grafici, icone e simboli dell'interfaccia. |
| `react-native-reanimated`, `react-native-worklets`, `@legendapp/motion` | Supporto alle animazioni. |
| `nativewind`, `tailwind-variants`, `@gluestack-ui/core`, `@gluestack-ui/utils` | Stili e componenti dell'interfaccia. |
| `react-aria`, `react-stately`, `@react-aria/ssr`, `@react-aria/utils`, `@expo/html-elements`, `react-dom` | Dipendenze di supporto ai componenti UI e alla compatibilità web. |
| `@react-native/new-app-screen` | Pacchetto del template React Native, attualmente non usato direttamente dall'app. |

Le dipendenze di sviluppo in `package.json` includono TypeScript e i tipi React per il controllo del codice, Babel e Metro per trasformazione e bundling, la CLI React Native per le build, ESLint e Prettier per lo stile del codice, Jest e React Test Renderer per i test, e Tailwind CSS con il relativo plugin Prettier per gli stili.

## Servizi e dati usati

| Servizio | Utilizzo | Chiave locale |
| --- | --- | --- |
| [OpenRouteService](https://openrouteservice.org/) | API `cycling-road` per il calcolo del percorso in GeoJSON, inclusi dati di elevazione e superficie. | `ORS_API_KEY` |
| [OpenFreeMap](https://openfreemap.org/) e [MapLibre](https://maplibre.org/) | Stile della mappa stradale e visualizzazione interattiva. | Nessuna |
| [Esri World Imagery](https://www.esri.com/en-us/arcgis/products/arcgis-living-atlas) | Immagini satellitari e livello delle etichette nella vista ibrida. | Nessuna variabile configurata |
| Posizione del dispositivo | Centra la mappa sulla posizione corrente, dopo il consenso dell'utente. | Nessuna |
| AsyncStorage sul dispositivo | Conserva percorsi salvati, tema, unità di misura e preferenze della mappa. | Nessuna |

I percorsi rimangono salvati sul dispositivo.