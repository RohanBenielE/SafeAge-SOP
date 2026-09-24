# SafeAGE React Native demo

This is the first two-module demonstration for the SafeAGE project:

- **Caregiver login:** search the local Indian medicine dataset, select a medicine, copy dosage/time from a prescription, and set recurring days.
- **Senior login:** view caregiver-assigned routines and mark a due dose as taken.

## Run it

1. Install Node.js 20 LTS and the Expo Go app on an Android phone (or use an Android emulator).
2. In this folder, run `npm install`.
3. Run `npm start` and scan the QR code with Expo Go.

## Firebase setup required now

1. Firebase Console → Firestore Database → Rules: replace the rules with `firestore.rules` in this project, then Publish. This is development-only access.
2. Restart Expo. Caregiver-created routines save in `medicineRoutines` and appear immediately in Senior view.
3. Local reminders work when notification permission is allowed. Exact Android alarms after app closure require a rebuilt Android app because `SCHEDULE_EXACT_ALARM` is a build-time permission.

## All 253k medicine search

Run this in a second PowerShell terminal from this folder:

`node medicine-search-server.mjs`

Find your laptop Wi-Fi IPv4 with `ipconfig`, then replace `192.168.1.2` in `App.js` with that address. Phone and laptop must use the same Wi-Fi. This server loads all CSV medicine records and returns the top ten matches; it must be replaced by a secured deployed API before public release.

## Important demo boundaries

- The app uses in-memory sample data. It intentionally does **not** give dosage, interaction, treatment, or emergency advice. The catalogue is autosuggestion only; caregiver must enter the dosage from a prescription.
- Production design should require an authenticated senior to approve a caregiver link, then enforce access using Firebase Authentication and Firestore Security Rules.
- A medicine catalogue may assist search, but it must not generate prescriptions. Medicine name, dose, frequency and schedule must originate from a clinician-approved prescription.

## Next implementation step

Add Firebase Authentication (Senior and Caregiver roles), Cloud Firestore for `users`, `caregiverLinks`, `medicines`, and `doseLogs`, and local notifications. Test the senior’s confirmation immediately appears in the caregiver dashboard.
