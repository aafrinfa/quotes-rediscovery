<template>
  <div v-if="loading" class="text-center pa-10">
    <v-progress-circular indeterminate color="primary" />
  </div>
  <v-alert v-else-if="error" type="error" :text="error" />
  <div v-else-if="!quote" class="text-center pa-10">
    <p class="text-h6 mb-4">No quotes yet</p>
    <v-btn color="primary" to="/import">Import quotes</v-btn>
  </div>
  <v-card v-else class="pa-6 pa-sm-12 mt-4" elevation="2">
    <div class="text-subtitle-1 text-secondary mb-4">Quote of the day</div>
    <blockquote class="serif quote">{{ quote.text }}</blockquote>
    <div class="mt-8">
      <div class="text-h6 serif">{{ quote.book.title }}</div>
      <div v-if="quote.book.author" class="text-medium-emphasis">{{ quote.book.author }}</div>
    </div>
    <v-btn class="mt-6" variant="text" color="primary" to="/settings" prepend-icon="mdi-bell-outline">
      Daily notification
    </v-btn>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';

const quote = ref(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    quote.value = await api.get('/quote-of-day');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.quote {
  font-size: 1.5rem;
  line-height: 1.7;
  white-space: pre-line;
  color: #3e2c25;
}
</style>
