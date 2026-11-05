<template>
  <div>
    <h2 class="text-h6 mb-4">Quotes</h2>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-select
          v-model="bookId"
          :items="books"
          item-title="title"
          item-value="_id"
          label="Book"
          clearable
          variant="outlined"
          density="comfortable"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field v-model="search" label="Search" prepend-inner-icon="mdi-magnify" clearable variant="outlined" density="comfortable" />
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" :text="error" class="mb-4" closable @click:close="error = ''" />
    <p v-if="!loading && !shown.length" class="text-center pa-10">No quotes found</p>

    <v-card v-for="q in shown" :key="q._id" class="mb-3">
      <v-card-text class="serif quote">{{ q.text }}</v-card-text>
      <v-card-actions>
        <div class="text-caption text-medium-emphasis ml-2">
          {{ q.book.title }}<span v-if="q.book.author">, {{ q.book.author }}</span>
        </div>
        <v-spacer />
        <v-btn icon="mdi-pencil-outline" variant="text" aria-label="Edit quote" @click="editing = { id: q._id, text: q.text }" />
        <v-btn icon="mdi-delete-outline" variant="text" aria-label="Delete quote" @click="deleting = q" />
      </v-card-actions>
    </v-card>

    <v-dialog :model-value="!!editing" max-width="640" @update:model-value="editing = null">
      <v-card v-if="editing" title="Edit quote">
        <v-card-text>
          <v-textarea v-model="editing.text" auto-grow rows="4" variant="outlined" autofocus />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="editing = null">Cancel</v-btn>
          <v-btn color="primary" :disabled="!editing.text.trim()" @click="saveEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="!!deleting" max-width="420" @update:model-value="deleting = null">
      <v-card v-if="deleting" title="Delete quote?">
        <v-card-text class="serif">{{ deleting.text }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleting = null">Cancel</v-btn>
          <v-btn color="error" @click="remove">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api.js';

const route = useRoute();
const quotes = ref([]);
const books = ref([]);
const bookId = ref(route.query.book || null);
const search = ref('');
const loading = ref(true);
const error = ref('');
const editing = ref(null);
const deleting = ref(null);

async function load() {
  loading.value = true;
  try {
    quotes.value = await api.get('/quotes' + (bookId.value ? `?book=${bookId.value}` : ''));
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

const shown = computed(() => {
  const s = (search.value || '').trim().toLowerCase();
  return s ? quotes.value.filter((q) => q.text.toLowerCase().includes(s)) : quotes.value;
});

async function saveEdit() {
  try {
    const updated = await api.put('/quotes/' + editing.value.id, { text: editing.value.text });
    const i = quotes.value.findIndex((q) => q._id === updated._id);
    if (i !== -1) quotes.value[i] = updated;
    editing.value = null;
  } catch (e) {
    error.value = e.message;
    editing.value = null;
  }
}

async function remove() {
  try {
    await api.del('/quotes/' + deleting.value._id);
    quotes.value = quotes.value.filter((q) => q._id !== deleting.value._id);
  } catch (e) {
    error.value = e.message;
  }
  deleting.value = null;
}

watch(bookId, load);
onMounted(async () => {
  try {
    books.value = await api.get('/books');
  } catch (e) {
    error.value = e.message;
  }
  load();
});
</script>

<style scoped>
.quote {
  white-space: pre-line;
  font-size: 1.05rem;
  line-height: 1.6;
}
</style>
