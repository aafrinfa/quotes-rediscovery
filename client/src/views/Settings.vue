<template>
  <div>
    <h2 class="text-h6 mb-2">Daily notification</h2>
    <p class="mb-4 text-medium-emphasis">
      Get the quote of the day as a notification on this device. Enable it on each device you want to use.
    </p>

    <v-alert v-if="loaded && !settings.pushReady" type="warning" class="mb-4">
      The server has no VAPID keys yet, so notifications are off. See the README.
    </v-alert>

    <v-switch v-model="enabled" label="Send me the quote of the day" color="primary" hide-details class="mb-2" />
    <v-text-field
      v-model="notifyTime"
      type="time"
      label="Time"
      :hint="`Timezone: ${timezone}`"
      persistent-hint
      variant="outlined"
      density="comfortable"
      style="max-width: 220px"
      class="mb-4"
    />

    <v-btn color="primary" :loading="busy" @click="save">Save settings</v-btn>
    <v-btn class="ml-2" variant="text" :disabled="!settings.devices" @click="sendTest">Send test notification</v-btn>
    <p v-if="settings.devices" class="text-caption mt-3 text-medium-emphasis">
      {{ settings.devices }} {{ settings.devices === 1 ? 'device' : 'devices' }} subscribed.
    </p>

    <v-snackbar v-model="toast.show" :color="toast.color" timeout="3500">{{ toast.text }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const settings = ref({ devices: 0, pushReady: true });
const enabled = ref(false);
const notifyTime = ref('08:00');
const loaded = ref(false);
const busy = ref(false);
const toast = ref({ show: false, text: '', color: 'success' });

const notify = (text, color = 'success') => (toast.value = { show: true, text, color });

function keyToBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// Ask permission, register the service worker and send the subscription to the server
async function subscribeThisDevice() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('This browser does not support push notifications.');
  }
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notification permission was denied. Allow it in your browser site settings.');
  }
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const { key } = await api.get('/push/key');
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }));
  await api.post('/push/subscribe', sub.toJSON());
}

async function save() {
  busy.value = true;
  try {
    if (enabled.value) await subscribeThisDevice();
    settings.value = await api.put('/settings', { enabled: enabled.value, notifyTime: notifyTime.value, timezone });
    notify('Settings saved');
  } catch (e) {
    notify(e.message, 'error');
  } finally {
    busy.value = false;
  }
}

async function sendTest() {
  try {
    await api.post('/push/test');
    notify('Test notification sent');
  } catch (e) {
    notify(e.message, 'error');
  }
}

onMounted(async () => {
  try {
    settings.value = await api.get('/settings');
    enabled.value = settings.value.enabled;
    notifyTime.value = settings.value.notifyTime;
  } catch (e) {
    notify(e.message, 'error');
  }
  loaded.value = true;
});
</script>
