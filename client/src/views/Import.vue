<template>
  <div>
    <!-- Step 3: saved -->
    <div v-if="result">
      <v-alert type="success" class="mb-4">
        Saved. Added {{ result.added }} {{ result.added === 1 ? 'quote' : 'quotes' }}
        <span v-if="result.skipped">, skipped {{ result.skipped }} already saved</span>.
      </v-alert>
      <v-btn color="primary" :to="{ path: '/quotes', query: { book: result.bookId } }" class="mr-2">View quotes</v-btn>
      <v-btn variant="text" @click="reset">Import another</v-btn>
    </div>

    <!-- Step 2: review -->
    <div v-else-if="parsed">
      <h2 class="text-h6 mb-4">Check before saving</h2>
      <v-text-field v-model="parsed.title" label="Title" variant="outlined" density="comfortable" />
      <v-text-field v-model="parsed.author" label="Author" variant="outlined" density="comfortable" />

      <div class="text-subtitle-1 mb-2">{{ parsed.quotes.length }} {{ parsed.quotes.length === 1 ? 'quote' : 'quotes' }}</div>
      <v-textarea
        v-for="(q, i) in parsed.quotes"
        :key="i"
        v-model="parsed.quotes[i]"
        auto-grow
        rows="2"
        variant="outlined"
        density="comfortable"
        append-inner-icon="mdi-delete-outline"
        @click:append-inner="parsed.quotes.splice(i, 1)"
      />

      <v-alert v-if="error" type="error" :text="error" class="mb-4" />
      <v-btn variant="text" @click="parsed = null">Back</v-btn>
      <v-btn color="primary" :loading="busy" :disabled="!parsed.title.trim() || !parsed.quotes.length" @click="save">
        Save
      </v-btn>
    </div>

    <!-- Step 1: paste -->
    <div v-else>
      <h2 class="text-h6 mb-2">Import from ReadEra</h2>
      <p class="mb-4 text-medium-emphasis">
        Paste the exported text. The first line is the title, the second is the author, and quotes are separated by *****.
      </p>
      <v-textarea v-model="raw" label="Exported text" rows="14" variant="outlined" />
      <v-alert v-if="error" type="error" :text="error" class="mb-4" />
      <v-btn color="primary" :loading="busy" :disabled="!raw.trim()" @click="parse">Parse</v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../api.js';

const raw = ref('');
const parsed = ref(null);
const result = ref(null);
const busy = ref(false);
const error = ref('');

async function run(fn) {
  busy.value = true;
  error.value = '';
  try {
    await fn();
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

const parse = () => run(async () => (parsed.value = await api.post('/import/parse', { text: raw.value })));
const save = () => run(async () => (result.value = await api.post('/import/save', parsed.value)));

function reset() {
  raw.value = '';
  parsed.value = null;
  result.value = null;
}
</script>
